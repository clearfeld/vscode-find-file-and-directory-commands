import * as vscode from "vscode";
import { minibuffer_find_file__activate } from "./minibuffer-find-file";
import { fd_find__activate } from "./fd-find-commands";
import { rg_find_file__activate } from "./rg-find-file-commands";

// let EXT_DefaultDirectory: string;
// function PullConfigurationAndSet(): void {
//   const emffc_config = vscode.workspace.getConfiguration(
//     "emacs-minibuffer-find-file-commands"
//   );
//   EXT_DefaultDirectory = (emffc_config.get("defaultDirectory") as string) ?? "";
// }

export function activate(context: vscode.ExtensionContext) {
  // PullConfigurationAndSet();

  minibuffer_find_file__activate(context);
  fd_find__activate(context);
  rg_find_file__activate(context);
}
