/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  Action
} from '@phosphor/datastore';


/**
 * An enum of the output action type names.
 */
export
enum OutputActionType {
  APPEND_OUTPUT = '@jupyterlab/outputarea/APPEND_OUTPUT',
  CLEAR_OUTPUTS = '@jupyterlab/outputarea/CLEAR_OUTPUTS',
  SET_OUTPUT_DATA = '@jupyterlab/outputarea/SET_OUTPUT_DATA'
}


/**
 * An action for appending output to an output area.
 */
export
class AppendOutputAction extends Action<OutputActionType.APPEND_OUTPUT> {
  /**
   * @param areaId - The id of the output area.
   *
   * @param output - The output object to add to the area.
   */
  constructor(
    public readonly areaId: string,
    public readonly output: nbformat.IOutput) {
    super(OutputActionType.APPEND_OUTPUT);
  }
}


/**
 * An action for clearing the outputs of an output area.
 */
export
class ClearOutputsAction extends Action<OutputActionType.CLEAR_OUTPUTS> {
  /**
   * @param areaId - The id of the output area.
   *
   * @param wait - Wait for the next output before clearing.
   */
  constructor(
    public readonly areaId: string,
    public readonly wait: boolean) {
    super(OutputActionType.CLEAR_OUTPUTS);
  }
}


/**
 * An action for setting the mime data of an output item.
 */
export
class SetOutputDataAction extends Action<OutputActionType.SET_OUTPUT_DATA> {
  /**
   * @param itemId - The id of the output item.
   *
   * @param data - The mime data to set for the output item.
   *
   * @param metadata - The mime metadata to set for the output item.
   */
  constructor(
    public readonly itemId: string,
    public readonly data: ReadonlyJSONObject | null,
    public readonly metadata: ReadonlyJSONObject | null) {
    super(OutputActionType.SET_OUTPUT_DATA);
  }
}


/**
 * A type alias of the supported output actions.
 */
export
type OutputAction = (
  AppendOutputAction |
  ClearOutputsAction |
  SetOutputDataAction
);
