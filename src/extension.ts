import * as vscode from "vscode";
// @ts-ignore
import * as Path from "path";
// @ts-ignore
import * as cp from "child_process";

async function pathToCurrentDirectory(): Promise<string | null> {
  const currentEditor = vscode.window.activeTextEditor;
  if (currentEditor) {
    return Path.dirname(currentEditor.document.uri.path);
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

export function activate(context: vscode.ExtensionContext) {
  PullConfigurationAndSet();

  // @ts-ignore
  const provider = new ColorsViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ColorsViewProvider.viewType,
      provider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("emacs.findFileEditor", async () => {
      provider.createCatCodingView();

      if (!provider._panel) {
        return;
      }

      let defaultDir = await pathToCurrentDirectory();
      console.log("defaultDir - ", defaultDir);

      let cmd = "cd && dir /o";
      let dir = null;

      if (defaultDir !== null) {
        defaultDir += Path.sep;
        dir = vscode.Uri.file(defaultDir);
        defaultDir = defaultDir.substr(1, defaultDir.length - 2);
        defaultDir = defaultDir.replaceAll("/", "\\");
        // cmd = `cd ${defaultDir} && dir /o`;
        cmd = `dir /o ${defaultDir}`;
      } else {
        defaultDir = EXT_DefaultDirectory;
      }
      console.log("defaultDir - ", defaultDir);

      // // enable this to get dir of active editor
      // if (dir !== null) {
      //   // console.log(defaultDir);
      //   let dirx = defaultDir?.substring(1, defaultDir.length - 1);
      //   cmd = `cd ${dirx} && dir /o ${dirx}`;
      //   console.log(cmd);
      //   //cmd = cmd + " " + defaultDir?.substring(1, defaultDir.length - 1);
      // }

      cp.exec(cmd, (err: any, stdout: any, stderr: any) => {
        console.log("stdout: " + stdout);
        console.log("stderr: " + stderr);
        if (err) {
          console.log("error: " + err);
        } else {
          const result = stdout.split(/\r?\n/);
          provider._panel?.webview.postMessage({
            command: "refactor",
            data: JSON.stringify(result),
            directory: JSON.stringify(defaultDir),
          });
        }
      });
    })
  );

  // Our new command
  context.subscriptions.push(
    vscode.commands.registerCommand("emacs.findFilePanel", async () => {
      let defaultDir = await pathToCurrentDirectory();
      console.log("defaultDir - ", defaultDir);

      let cmd = "cd && dir /o";
      let dir = null;

      if (defaultDir !== null) {
        defaultDir += Path.sep;
        dir = vscode.Uri.file(defaultDir);
        defaultDir = defaultDir.substr(1, defaultDir.length - 2);
        defaultDir = defaultDir.replaceAll("/", "\\");
        // cmd = `cd ${defaultDir} && dir /o`;
        cmd = `dir /o ${defaultDir}`;
      } else {
        defaultDir = EXT_DefaultDirectory;
      }

      console.log("defaultDir - ", defaultDir);

      /// TODO: investigate this more this seems too hackish to leave as is
      let throw_away = null;
      throw_away = await vscode.commands.executeCommand(
        "setContext",
        "emacs.findFilePanel",
        true
      );
      throw_away = await vscode.commands.executeCommand(
        "emacs.findFileView.focus"
      );
      throw_away = await vscode.commands.executeCommand(
        "emacs.findFileView.focus"
      );
      ///

      if (!provider._view) {
        return;
      }

      provider._view.show(true);

      // this.rgProc = cp.spawn(rgPath, rgArgs.args, { cwd: rootFolder });

      cp.exec(cmd, (err: any, stdout: any, stderr: any) => {
        // cp.exec(`cd && ls -al --group-directories-first C:\\ | awk '{print $9 "\`" $1 "\`" $5 "\`" $6" "$7" "$8}'`, (err: any, stdout: any, stderr: any) => {
        console.log("stdout: " + stdout);
        console.log("stderr: " + stderr);
        if (err) {
          console.log("error: " + err);
        } else {
          // get current theme properties color
          // respect theme color choice
          // const color = new vscode.ThemeColor('badge.background');

          const result = stdout.split(/\r?\n/);
          provider._view?.webview.postMessage({
            command: "refactor",
            data: JSON.stringify(result),
            directory: JSON.stringify(defaultDir),
          });
        }
      });

      // // Send a message to our webview.
      // // You can send any JSON serializable data.
      // provider._view.webview.postMessage({
      //   command: "refactor",
      //   data: dir,
      // });
    })
  );
}

class ColorsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "emacs.findFileView";

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
    // let vuri = new vscode.Uri;
    this._panel = vscode.window.createWebviewPanel(
      "emacs.findFileView",
      // "my-fancy-view",// this.viewType, // "catCoding",
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

        case "CreateFile":
          {
            let buf = new Uint8Array();
            let duri = vscode.Uri.file(data.directory + "\\" + data.value);
            let throw_away = await vscode.workspace.fs.writeFile(duri, buf);
            // @ts-ignore
            const openPath = vscode.Uri.parse(duri);
            vscode.workspace.openTextDocument(openPath).then((document) => {
              vscode.window.showTextDocument(document);
              this._panel?.dispose();
            });
          }
          break;

        case "Enter": {
          cp.exec(
            `dir /o "${data.value}"`,
            (err: any, stdout: any, stderr: any) => {
              // console.log("stderr: " + stderr);
              if (err) {
                console.log("stderr - error: " + err);
              } else {
                console.log("stdout - " + stdout);
                // get current theme properties color
                // respect theme color choice
                // const color = new vscode.ThemeColor('badge.background');

                const result = stdout.split(/\r?\n/);
                this._panel?.webview.postMessage({
                  command: "directory_change",
                  data: JSON.stringify(result),
                });
              }
            }
          );

          break;
        }

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
    // return;

    this._view = webviewView;

    webviewView.webview.options = this.webview_options;

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this._view?.onDidDispose((data) => {
      // switch (data.type)
      console.log("view panel disposed - ", data);
    });

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "colorSelected": {
          vscode.window.activeTextEditor?.insertSnippet(
            new vscode.SnippetString(`#${data.value}`)
          );
          break;
        }

        case "OpenFile":
          {
            console.log("data.value - ", data.value);
            vscode.workspace.openTextDocument(data.value).then((document) => {
              vscode.window.showTextDocument(document);
              this._view = undefined;
              vscode.commands.executeCommand(
                "setContext",
                "emacs.findFilePanel",
                false
              );

              ClosePanelOnCompletionIfNotInitiallyOpened();
            });
          }
          break;

        case "CreateFile":
          {
            let buf = new Uint8Array();
            let duri = vscode.Uri.file(data.directory + "\\" + data.value);
            let throw_away = await vscode.workspace.fs.writeFile(duri, buf);
            // @ts-ignore
            const openPath = vscode.Uri.parse(duri);
            vscode.workspace.openTextDocument(openPath).then((document) => {
              vscode.window.showTextDocument(document);
              this._view = undefined;
              vscode.commands.executeCommand(
                "setContext",
                "emacs.findFilePanel",
                false
              );

              ClosePanelOnCompletionIfNotInitiallyOpened();
            });
          }
          break;

        case "Enter":
          {
            cp.exec(
              `dir /o "${data.value}"`,
              (err: any, stdout: any, stderr: any) => {
                // console.log("stderr: " + stderr);
                if (err) {
                  console.log("stderr - error: " + err);
                } else {
                  console.log("stdout - " + stdout);
                  // get current theme properties color
                  // respect theme color choice
                  // const color = new vscode.ThemeColor('badge.background');

                  const result = stdout.split(/\r?\n/);
                  this._view?.webview.postMessage({
                    command: "directory_change",
                    data: JSON.stringify(result),
                  });
                }
              }
            );
          }
          break;

        case "Quit":
          {
            this._view = undefined;
            vscode.commands.executeCommand(
              "setContext",
              "emacs.findFilePanel",
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
        "minibuffer-find-file/dist",
        "minibuffer-find-file.js"
      )
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "minibuffer-find-file/dist/assets",
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

				<title>Cat Colors</title>
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
