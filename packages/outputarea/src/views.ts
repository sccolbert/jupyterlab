/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  IRenderMime, RenderMime
} from '@jupyterlab/rendermime';

import {
  JSONExt, ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  ConflatableMessage, Message, MessageLoop
} from '@phosphor/messaging';

import {
  PanelLayout, SingletonLayout, Widget
} from '@phosphor/widgets';

import {
  SetOutputDataAction
} from './actions';

import {
  DisplayDataOutput, ErrorOutput, OutputArea, OutputItem, OutputStore
} from './models';


/**
 * A widget which displays an output area.
 */
export
class OutputAreaView extends Widget {
  /**
   * Construct a new output area view.
   *
   * @param options - The options for initializing the view.
   */
  constructor(options: OutputAreaView.IOptions) {
    super();
    this.addClass('jp-OutputAreaView');
    this.store = options.store;
    this.areaId = options.areaId;
    this.store.changed.connect(this._onStoreChanged, this);
    this.layout = new PanelLayout();
  }

  /**
   * The output store which holds the output area.
   */
  readonly store: OutputStore;

  /**
   * The id of the output area.
   */
  readonly areaId: string;

  /**
   * The rendermime used for rendering.
   */
  readonly rendermime: RenderMime;

  /**
   * Request that the output area be refreshed.
   *
   * #### Notes
   * This is a batched asynchronous request.
   */
  refresh(): void {
    MessageLoop.postMessage(this, Private.RefreshRequest);
  }

  /**
   * Process a message sent to the widget.
   */
  processMessage(msg: Message): void {
    if (msg.type === 'refresh-request') {
      this._onRefreshRequest(msg);
    } else {
      super.processMessage(msg);
    }
  }

  /**
   * A message handler invoked on a `'before-attach'` message.
   */
  protected onBeforeAttach(msg: Message): void {
    this.refresh();
  }

  /**
   * A message handler invoked on a `'refresh-request'` message.
   */
  private _onRefreshRequest(msg: Message): void {
    // Unpack the store and rendermime.
    let { store, rendermime } = this;

    // Unpack the output area state.
    let { trusted, outputItemIds } = this._area;

    // Toggle the trusted class.
    this.toggleClass('jp-mod-trusted', trusted);

    // Collect a temporary mapping of the current item views.
    let layout = this.layout as PanelLayout;
    let itemIdMap: { [key: string]: OutputItemView } = {};
    for (let widget of layout.widgets) {
      if (widget instanceof OutputItemView) {
        itemIdMap[widget.itemId] = widget;
      }
    }

    // Synchronize the layout with the list.
    for (let i = 0; i < outputItemIds.size; ++i) {
      let view: OutputItemView;
      let itemId = outputItemIds.get(i);
      if (itemId in itemIdMap) {
        view = itemIdMap[itemId];
        delete itemIdMap[itemId];
      } else {
        view = new OutputItemView({ store, itemId, rendermime });
        view.addClass('jp-OutputAreaView-item');
      }
      if (layout.widgets[i] !== view) {
        layout.insertWidget(i, view);
      }
    }

    // Dispose of any remaining stale item views.
    for (let key in itemIdMap) {
      itemIdMap[key].dispose();
    }
  }

  /**
   * A handler for the output store `changed` signal.
   */
  private _onStoreChanged(): void {
    // Look up the output area.
    let area = this.store.state.outputAreaTable.get(this.areaId);

    // If the area id does not exist, use the empty area.
    area = area || Private.emptyArea;

    // Bail early if the output area did not change.
    if (this._area === area) {
      return;
    }

    // Update the internal output area.
    this._area = area;

    // Schedule a refresh.
    this.refresh();
  }

  private _area: OutputArea = Private.emptyArea;
}


/**
 * The namespace for the `OutputAreaView` class statics.
 */
export
namespace OutputAreaView {
  /**
   * An options object for initializing an output area view.
   */
  export
  interface IOptions {
    /**
     * The output store which holds the output area.
     */
    store: OutputStore;

    /**
     * The id of the output area.
     */
    areaId: string;

    /**
     * The rendermime to use for rendering.
     */
    rendermime: RenderMime;
  }
}


/**
 * A widget which displays a single item for an output area.
 */
export
class OutputItemView extends Widget {
  /**
   * Construct a new output item view.
   *
   * @param options - The options for initializing the view.
   */
  constructor(options: OutputItemView.IOptions) {
    super();
    this.addClass('jp-OutputItemView');
    this.store = options.store;
    this.itemId = options.itemId;
    this.rendermime = options.rendermime;
    this.store.changed.connect(this._onStoreChanged, this);
    this.layout = new SingletonLayout();
  }

  /**
   * The output store which holds the output item.
   */
  readonly store: OutputStore;

  /**
   * The id of the output item.
   */
  readonly itemId: string;

  /**
   * The rendermime used for rendering.
   */
  readonly rendermime: RenderMime;

  /**
   * Request that the output be refreshed.
   *
   * #### Notes
   * This is a batched asynchronous request.
   */
  refresh(): void {
    MessageLoop.postMessage(this, Private.RefreshRequest);
  }

  /**
   * Process a message sent to the widget.
   */
  processMessage(msg: Message): void {
    if (msg.type === 'refresh-request') {
      this._onRefreshRequest(msg);
    } else {
      super.processMessage(msg);
    }
  }

  /**
   * A message handler invoked on a `'before-attach'` message.
   */
  protected onBeforeAttach(msg: Message): void {
    this.refresh();
  }

  /**
   * A message handler invoked on a `'refresh-request'` message.
   */
  private _onRefreshRequest(msg: Message): void {
    // Fetch the widget layout.
    let layout = this.layout as SingletonLayout;

    // Fetch the existing renderer from the layout.
    let renderer = layout.widget as IRenderMime.IRenderer;

    // Set up the item data.
    let trusted = this._item.trusted;
    let data = Private.getData(this._item);
    let metadata = Private.getMetadata(this._item);
    let setData = this._setData;

    // Create the new mime model.
    let model: IRenderMime.IMimeModel = { trusted, data, metadata, setData };

    // Look up the preferred mime type for the model.
    let mimeType = this.rendermime.preferredMimeType(data, !trusted) || '';

    // Look up the old mime type for the model.
    let oldMimeType = this.node.dataset['mimeType'];

    // Update the node state.
    this.toggleClass('jp-mod-trusted', trusted);
    this.node.dataset['outputType'] = this._item.type;
    this.node.dataset['mimeType'] = mimeType;

    // Update the existing renderer in-place if possible.
    if (renderer && oldMimeType === mimeType) {
      renderer.renderModel(model);
      return;
    }

    // Clear the layout if there is no mime type to render.
    if (!mimeType) {
      layout.widget = null;
      return;
    }

    // Create a new renderer for the mime type.
    renderer = this.rendermime.createRenderer(mimeType);
    renderer.addClass('jp-OutputItemView-renderer');
    renderer.renderModel(model);

    // Set the renderer on the layout.
    layout.widget = renderer;
  }

  /**
   * A handler for the output store `changed` signal.
   */
  private _onStoreChanged(): void {
    // Look up the output item.
    let item = this.store.state.outputItemTable.get(this.itemId) || null;

    // If the item id does not exist, use the empty item.
    item = item || Private.emptyItem;

    // Bail early if the output item did not change.
    if (this._item === item) {
      return;
    }

    // Update the internal output item.
    this._item = item;

    // Schedule a refresh.
    this.refresh();
  }

  /**
   * A callback function for setting the mime data.
   */
  private _setData = (options: IRenderMime.IMimeModel.ISetDataOptions) => {
    // Parse the data option.
    let data = options.data || null;

    // Parse the metadata option.
    let metadata = options.metadata || null;

    // Dispatch the set output data action.
    this.store.dispatch(new SetOutputDataAction(this.itemId, data, metadata));
  };

  private _item: OutputItem = Private.emptyItem;
}


/**
 * The namespace for the `OutputItemView` class statics.
 */
export
namespace OutputItemView {
  /**
   * An options object for initializing an output item view.
   */
  export
  interface IOptions {
    /**
     * The output store which holds the output item.
     */
    store: OutputStore;

    /**
     * The id of the output item.
     */
    itemId: string;

    /**
     * The rendermime to use for rendering.
     */
    rendermime: RenderMime;
  }
}


/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * A singleton conflatable refresh request message.
   */
  export
  const RefreshRequest = new ConflatableMessage('refresh-request');

  /**
   * An empty default output area model.
   */
  export
  const emptyArea = new OutputArea();

  /**
   * An empty default output item model.
   */
  export
  const emptyItem = new DisplayDataOutput();

  /**
   * Get the mime data for an output item.
   */
  export
  function getData(item: OutputItem): ReadonlyJSONObject {
    switch (item.type) {
    case 'execute_result':
    case 'display_data':
      return item.data;
    case 'stream':
      return { [`application/vnd.jupyter.${item.name}`]: item.text };
    case 'error':
      return { 'application/vnd.jupyter.stderr': formatError(item) };
    default:
      return JSONExt.emptyObject;
    }
  }

  /**
   * Get the mime metadata for an output item.
   */
  export
  function getMetadata(item: OutputItem): ReadonlyJSONObject {
    switch (item.type) {
    case 'execute_result':
    case 'display_data':
      return item.metadata;
    default:
      return JSONExt.emptyObject;
    }
  }

  /**
   * Format the error text for an error output.
   */
  function formatError(item: ErrorOutput): string {
    return item.traceback || `${item.ename}: ${item.evalue}`;
  }
}
