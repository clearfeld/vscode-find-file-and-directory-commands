import * as vscode from "vscode";
// @ts-ignore
import * as Path from "path";
// @ts-ignore
import * as cp from "child_process";

// const fd_files__git_root_Win32 = "@echo off && for /f %a in ('git rev-parse --show-toplevel') do cd %a && @echo on";
const git_root_Win32 =
  "for /f %a in ('git rev-parse --show-toplevel') do cd %a";
// const git_root_Unix = "cd $(git rev-parse --show-toplevel)";
const git_root_Unix =
  "cd $(git rev-parse --show-toplevel) && git rev-parse --show-toplevel";

// TODO: first priority clean up the code and move all the repeated functions to a helper file
// TODO: create editor counterpart to panel version of the ripgrep current dir command
// TODO: investigate spawn and gradual result parsing - internal vscode ripgrep should be doing something like this

// {
//   "command": "clearfeld.findFileRGEditor",
//   "category": "clearfeld",
//   "title": "Find File - Ripgrep (rg) (Editor)"
// },
// {
//   "command": "clearfeld.findFileRGGitRootEditor",
//   "category": "clearfeld",
//   "title": "Find File - Ripgrep (rg) from project root (GIT)(Editor)"
// },
// {
//   "command": "clearfeld.findFileRGGitRootPanel",
//   "category": "clearfeld",
//   "title": "Find File - Ripgrep (rg) from project root (GIT)(Panel)"
// }

async function pathToCurrentDirectory(): Promise<string | null> {
  const currentEditor = vscode.window.activeTextEditor;
  if (currentEditor) {
    return Path.dirname(currentEditor.document.uri.fsPath);
  }

  return null;
}

let EXT_DefaultDirectory: string;
function PullConfigurationAndSet(): void {
  const emffc_config = vscode.workspace.getConfiguration(
    "emacs-minibuffer-find-file-commands"
  );
  EXT_DefaultDirectory = (emffc_config.get("defaultDirectory") as string) ?? "";
}

export function rg_find_file__activate(context: vscode.ExtensionContext) {
  // PullConfigurationAndSet();

  // @ts-ignore
  const provider = new RGViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(RGViewProvider.viewType, provider)
  );

  // find file (RG) current directory
  //   context.subscriptions.push(
  //     vscode.commands.registerCommand("clearfeld.findFileRGEditor", async () => {
  //       provider.createCatCodingView();

  //       if (!provider._panel) {
  //         return;
  //       }

  //       let [cmd, defaultDir] = await DetermineCMDAndDefaultDir(fd_files);

  //       PostCPResultsToView(provider._panel?.webview, cmd, defaultDir);
  //     })
  //   );

  context.subscriptions.push(
    vscode.commands.registerCommand("clearfeld.findFileRGPanel", async () => {
      /// TODO: FIXME: HACK: investigate this more this seems too hackish to leave as is
      let throw_away = null;
      throw_away = await vscode.commands.executeCommand(
        "setContext",
        "clearfeld.findFileRGPanel",
        true
      );
      throw_away = await vscode.commands.executeCommand(
        "clearfeld.findFileRGView.focus"
      );
      throw_away = await vscode.commands.executeCommand(
        "clearfeld.findFileRGView.focus"
      );
      ///

      if (!provider._view) {
        return;
      }

      let [cmd, defaultDir] = await DetermineCMDAndDefaultDir("cd");

      provider._view.show(true);

      PostCPResultsToView(provider._view?.webview, cmd, defaultDir);
    })
  );

  //   // find file (RG) from git project root
  //   context.subscriptions.push(
  //     vscode.commands.registerCommand(
  //       "clearfeld.findFileRGGitRootEditor",
  //       async () => {
  //         provider.createCatCodingView();

  //         if (!provider._panel) {
  //           return;
  //         }

  //         let fd_command;
  //         if (process.platform === "win32") {
  //           fd_command = git_root_Win32 + " && " + fd_files;
  //         } else {
  //           fd_command = git_root_Unix + " && " + fd_files;
  //         }

  //         let [cmd, defaultDir] = await DetermineCMDAndDefaultDir(fd_command);

  //         PostCPResultsToView(provider._panel?.webview, cmd, defaultDir);
  //       }
  //     )
  //   );

  //   context.subscriptions.push(
  //     vscode.commands.registerCommand(
  //       "clearfeld.findFileRGGitRootPanel",
  //       async () => {
  //         /// TODO: FIXME: HACK: investigate this more this seems too hackish to leave as is
  //         let throw_away = null;
  //         throw_away = await vscode.commands.executeCommand(
  //           "setContext",
  //           "clearfeld.findFileRGPanel",
  //           true
  //         );
  //         throw_away = await vscode.commands.executeCommand(
  //           "clearfeld.findFileRGView.focus"
  //         );
  //         throw_away = await vscode.commands.executeCommand(
  //           "clearfeld.findFileRGView.focus"
  //         );
  //         ///

  //         if (!provider._view) {
  //           return;
  //         }

  //         let fd_command;
  //         if (process.platform === "win32") {
  //           fd_command = git_root_Win32 + " && " + fd_files;
  //         } else {
  //           fd_command = git_root_Unix + " && " + fd_files;
  //         }

  //         let [cmd, defaultDir] = await DetermineCMDAndDefaultDir(fd_command);

  //         provider._view.show(true);

  // 		cp.exec("cd", (err: any, stdout: any, stderr: any) => {
  // 			// console.log("stdout: " + stdout);
  // 			// console.log("stderr: " + stderr);
  // 			if (err) {
  // 			  // console.log("error: " + err, stdout);
  // 			} else {
  // 			  const result = stdout.split(/\r?\n/);
  // 			  provider._view?.webview.postMessage({
  // 				command: "cp_results",
  // 				data: [""],
  // 				directory: result[0]
  // 				// line: GetCurrentLineInActiveEditor(),
  // 			  });

  // 			//   view.postMessage({
  // 			// 	command: "cp_results",
  // 			// 	data: JSON.stringify(result),
  // 			// 	directory: JSON.stringify(dir),
  // 			// 	system: system
  // 			//   });
  // 			}
  // 		  });

  //         // PostCPResultsToView(provider._view?.webview, cmd, defaultDir);
  //       }
  //     )
  //   );
}

let defaultDir: string | null;
async function DetermineCMDAndDefaultDir(
  fd_command: string
): Promise<[string, string]> {
  defaultDir = await pathToCurrentDirectory();
  let cmd; //  = `cd && ${lsd_command}`;

  if (defaultDir !== null) {
    // cmd = `${lsd_command} ${defaultDir}`;
  } else {
    defaultDir = EXT_DefaultDirectory;
  }

  cmd = `${defaultDir.substring(0, 2)} && cd ${defaultDir} && ${fd_command}`;

  return [cmd, defaultDir];
}

function PostCPResultsToView(
  view: vscode.Webview,
  cmd: string,
  dir: string
): void {
  let system: string;
  if (process.platform === "win32") {
    system = "win32";
  } else {
    system = "unix";
  }

  view.postMessage({
    command: "cp_results",
    data: [""],
    directory: dir,
    system: system,
  });
  return;

  //   // cmd
  //   cp.exec("", (err: any, stdout: any, stderr: any) => {
  //     // console.log("stdout: " + stdout);
  //     // console.log("stderr: " + stderr);
  //     if (err) {
  //       // console.log("error: " + err, stdout);

  //       const result = stdout.split(/\r?\n/);
  //       view.postMessage({
  //         command: "cp_results",
  //         data: [""], // SON.stringify(result),
  //         directory: dir,
  //         system: system
  //       });
  //     } else {
  //       const result = stdout.split(/\r?\n/);
  //       view.postMessage({
  //         command: "cp_results",
  //         data: [""], // JSON.stringify(result),
  //         directory: dir, // JSON.stringify(dir),
  //         system: system
  //       });
  //     }
  //   });
}

class RGViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "clearfeld.findFileRGView";

  public _view?: vscode.WebviewView;
  public _panel?: vscode.WebviewPanel;

  private readonly webview_options = {
    enableScripts: true,

    localResourceRoots: [
      this._extensionUri,
      vscode.Uri.joinPath(
        this._extensionUri,
        "minibuffer-find-file/dist",
        "minibuffer-find-file/dist/assets"
      ),
    ],
  };

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _myUri: vscode.Uri
  ) {}

  public createCatCodingView() {
    // _token: vscode.CancellationToken // context: vscode.WebviewViewResolveContext, // webviewView: vscode.WebviewView,
    // Create and show panel
    this._panel = vscode.window.createWebviewPanel(
      "clearfeld.findFileRGView",
      // "my-fancy-view",// this.viewType,
      "Minibuffer: File Open",
      vscode.ViewColumn.Active,
      this.webview_options
    );

    // And set its HTML content
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    this._panel.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "OpenFile":
          {
            console.log("data.value - ", data.value);
            vscode.workspace.openTextDocument(data.value).then((document) => {
              vscode.window.showTextDocument(document);
              this._panel?.dispose();
            });
          }
          break;

        // case "Enter": {
        //   cp.exec(
        //     `${lsd_command} ${data.value}`,
        //     (err: any, stdout: any, stderr: any) => {
        //       // console.log("stderr: " + stderr);
        //       if (err) {
        //         console.log("stderr - error: " + err);

        //         const result = stdout.split(/\r?\n/);
        //         this._panel?.webview.postMessage({
        //           command: "directory_change",
        //           data: JSON.stringify(result),
        //         });
        //       } else {
        //         const result = stdout.split(/\r?\n/);
        //         this._panel?.webview.postMessage({
        //           command: "directory_change",
        //           data: JSON.stringify(result),
        //         });
        //       }
        //     }
        //   );

        //   break;
        // }

        case "Quit":
          {
            this._panel?.dispose();
          }
          break;
      }
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = this.webview_options;

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this._view?.onDidDispose((data) => {
      // switch (data.type)
      console.log("view panel disposed - ", data);
    });

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "OpenFile":
          {
            console.log("OpenFile - data - ", data, data.file_path);
            const file_uri: vscode.Uri = vscode.Uri.file(data.file_path);
            vscode.workspace.openTextDocument(file_uri).then((document) => {
              vscode.window.showTextDocument(document);
              this._view = undefined;
              vscode.commands.executeCommand(
                "setContext",
                "clearfeld.findFileRGPanel",
                false
              );

              ClosePanelOnCompletionIfNotInitiallyOpened();
            });
          }
          break;

        case "SearchValueChange":
          {
            // console.log();
            // if (defaultDir === null) return;

            const editor = vscode.window.activeTextEditor;

            if (data.value === "") {
              return;
            }

            // console.log(data, data.directory);

            // const text = editor?.document.getText();
            // console.log(text);
            // let cmd = `echo ${text} | rg "${data.value}" "${defaultDir}" --json -i`;

            let cd_cmd = `${data.directory.substring(0, 2)} && cd ${
              data.directory
            }`;
            let cmd = `${cd_cmd} && rg "${data.value}" . --vimgrep --json -i | jq -s ".[] | select(.type==\\"match\\")" -c`; // && cmd

            // console.log(cmd);

            // let cmd = `rg "${data.value}" "${defaultDir}" --vimgrep --json -i | jq -s ".[] | select(.type==\\"match\\")" -c`;

            // F:\Dev\aspis\lib>rg "void" --vimgrep --json -i | jq -s ".[] | select(.type==\"match\")" -c

            cp.exec(cmd, (err: any, stdout: any, stderr: any) => {
              // console.log("stderr: " + stderr);
              if (err) {
                console.log("stderr - error: " + err);

                this._view?.webview.postMessage({
                  command: "cp_results",
                  data: [""],
                  directory: defaultDir,
                  // line: GetCurrentLineInActiveEditor(),
                });
              } else {
                // console.log("stdout - " + stdout);
                // get current theme properties color
                // respect theme color choice
                // const color = new vscode.ThemeColor('badge.background');

                let _ripgrep_results = stdout.split(/\r?\n/);
                this._view?.webview.postMessage({
                  command: "cp_results",
                  data: _ripgrep_results, // JSON.stringify(result),
                  directory: defaultDir,
                  // line: GetCurrentLineInActiveEditor(),
                });

                // // mmove to line
                // if (result.length > 1) {
                //   const parse_res = JSON.parse(result[1]);
                //   if (parse_res.type === "match") {
                //     const editor = vscode.window.activeTextEditor;
                //     if (editor) {
                //       const line = parse_res.data.line_number - 1;

                //       const range = editor.document.lineAt(line).range;

                //       const new_range = new vscode.Range(
                //         line,
                //         parse_res.data.submatches[0].start,
                //         line,
                //         parse_res.data.submatches[0].end
                //       );

                //       // editor.selection = new vscode.Selection(range.start, range.end);
                //       editor.selection = new vscode.Selection(
                //         new_range.start,
                //         new_range.start
                //       );

                //       const smallNumbers: vscode.DecorationOptions[] = [];
                //       const largeNumbers: vscode.DecorationOptions[] = [];
                //       const decoration = {
                //         range: new vscode.Range(new_range.start, new_range.end),
                //       };
                //       smallNumbers.push(decoration);
                //       const decorationz = {
                //         range: new vscode.Range(
                //           new_range.start,
                //           new_range.start
                //         ),
                //       };
                //       largeNumbers.push(decorationz);
                //       editor.setDecorations(
                //         SearchResultDecorationType,
                //         smallNumbers
                //       );
                //       editor.setDecorations(
                //         WholeLineDecorationType,
                //         largeNumbers
                //       );

                //       editor.revealRange(range);
                //     }
                //   }
                // }
              }
            });
          }
          break;

        // case "Enter":
        //   {
        //     cp.exec(
        //       `${lsd_command} ${data.value}`,
        //       (err: any, stdout: any, stderr: any) => {
        //         // console.log("stderr: " + stderr);
        //         if (err) {
        //           // console.log("stderr - error: " + err, stdout);
        //           const result = stdout.split(/\r?\n/);
        //           this._view?.webview.postMessage({
        //             command: "directory_change",
        //             data: JSON.stringify(result),
        //           });
        //         } else {
        //           // console.log("stdout - " + stdout);
        //           // get current theme properties color
        //           // respect theme color choice
        //           // const color = new vscode.ThemeColor('badge.background');

        //           const result = stdout.split(/\r?\n/);
        //           this._view?.webview.postMessage({
        //             command: "directory_change",
        //             data: JSON.stringify(result),
        //           });
        //         }
        //       }
        //     );
        //   }
        //   break;

        case "Quit":
          {
            this._view = undefined;
            vscode.commands.executeCommand(
              "setContext",
              "clearfeld.findFileRGPanel",
              false
            );

            ClosePanelOnCompletionIfNotInitiallyOpened();
          }
          break;
      }
    });
  }

  public _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "webviews_builds/rg/dist",
        "minibuffer-find-file.js"
      )
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "webviews_builds/rg/dist/assets",
        "style.css"
      )
    );

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
        <link href="${styleUri}" rel="stylesheet">

				<title>Clearfeld - find file commands</title>
			</head>
			<body>
				<div id="root"><div/>
				<div id="shi"><div/>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function ClosePanelOnCompletionIfNotInitiallyOpened(): void {
  // TODO: figure out how to check if panel was open prior to invoking the find file command
  // conditionally close the panel if it wasnt open before otherwise move back to whatever view in the panel was last active
  vscode.commands.executeCommand("workbench.action.togglePanel");
}
