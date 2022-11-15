import * as vscode from "vscode";
import * as Path from "path";
import * as cp from "child_process";

async function pickWorkspace(): Promise<string> {
  const targetWorkspaceFolder: vscode.WorkspaceFolder | undefined =
    await vscode.window.showWorkspaceFolderPick();
  if (targetWorkspaceFolder === undefined) {
    throw new Error(
      "No workspace is opened TODO have default directory opened."
    );
    // TODO: add default directory to search from or something
  }

  return targetWorkspaceFolder.uri.path;
}

async function pathToCurrentDirectory(): Promise<string | null> {
  const currentEditor = vscode.window.activeTextEditor;
  if (currentEditor) {
    return Path.dirname(currentEditor.document.uri.path);
  }

  return null;
  // return Path.dirname(currentEditor.document.uri.path);
  // return pickWorkspace();
}

async function pathToCurrentWorkspace(): Promise<string | null> {
  const currentEditor = vscode.window.activeTextEditor;
  if (currentEditor) {
    return vscode.workspace.getWorkspaceFolder(currentEditor.document.uri).uri
      .path;
  }

  return null;
  // return Path.dirname(currentEditor.document.uri.path);
  // return pickWorkspace();
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new ColorsViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ColorsViewProvider.viewType,
      provider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("calicoColors.addColor", () => {
      provider.addColor();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("calicoColors.clearColors", () => {
      provider.clearColors();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("calicoColors.catCoding", async () => {
      provider.createCatCodingView();

      if (!provider._panel) {
        return;
      }
      vscode.commands.executeCommand(
        "setContext",
        "clearfeld-minibuffer-find-file.active",
        true
      );

      let defaultDir = await pathToCurrentDirectory();
      defaultDir += Path.sep;
      console.log("defaultDir - ", defaultDir);
      let dir = null;

      let cmd = "cd && dir /o";

      if (defaultDir !== null) {
        dir = vscode.Uri.file(defaultDir);
        defaultDir = defaultDir.substr(1, defaultDir.length - 2);
        defaultDir = defaultDir.replaceAll("/", "\\");
        // cmd = `cd ${defaultDir} && dir /o`;
        cmd = `dir /o ${defaultDir}`;
      }
      console.log("defaultDir - ", defaultDir);

      // enable this to get dir of active editor
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
    vscode.commands.registerCommand("calico.test", async () => {
      if (!provider._view) {
        return;
      }
      vscode.commands.executeCommand(
        "setContext",
        "clearfeld-minibuffer-find-file.active",
        true
      );

      provider._view.show(true);

      let defaultDir = await pathToCurrentDirectory();
      defaultDir += Path.sep;
      let dir = vscode.Uri.file(defaultDir);

      // this.rgProc = cp.spawn(rgPath, rgArgs.args, { cwd: rootFolder });

      cp.exec("cd && dir /o", (err: any, stdout: any, stderr: any) => {
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
            directory: null,
          });
        }
      });

      // Send a message to our webview.
      // You can send any JSON serializable data.
      provider._view.webview.postMessage({
        command: "refactor",
        data: dir,
      });
    })
  );

  // Our new command
  context.subscriptions.push(
    vscode.commands.registerCommand("calicoColors.catTest", async () => {
      if (!provider._panel) {
        return;
      }
      vscode.commands.executeCommand(
        "setContext",
        "clearfeld-minibuffer-find-file.active",
        true
      );

      // provider._panel.show(true);

      // let defaultDir = await pathToCurrentDirectory();
      // defaultDir += Path.sep;
      // let dir = vscode.Uri.file(defaultDir);

      // this.rgProc = cp.spawn(rgPath, rgArgs.args, { cwd: rootFolder });

      cp.exec("cd && dir /o", (err: any, stdout: any, stderr: any) => {
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
          provider._panel?.webview.postMessage({
            command: "refactor",
            data: JSON.stringify(result),
          });
        }
      });

      // Send a message to our webview.
      // You can send any JSON serializable data.
      // provider._panel.webview.postMessage({
      //   command: "refactor",
      //   data: dir,
      // });
    })
  );
}

class ColorsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "calicoColors.colorsView";

  public _view?: vscode.WebviewView;
  public _panel?: vscode.WebviewPanel;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _myUri: vscode.Uri
  ) {}

  public createCatCodingView() // _token: vscode.CancellationToken // context: vscode.WebviewViewResolveContext, // webviewView: vscode.WebviewView,
  {
    // Create and show panel
    // let vuri = new vscode.Uri;
    this._panel = vscode.window.createWebviewPanel(
      "calicoColors.colorsView",
      // "my-fancy-view",// this.viewType, // "catCoding",
      "Minibuffer: File Open",
      vscode.ViewColumn.One,
      {
        // Allow scripts in the webview
        enableScripts: true,

        localResourceRoots: [
          this._extensionUri,
          vscode.Uri.joinPath(
            this._extensionUri,
            "minibuffer-find-file/dist",
            "minibuffer-find-file/dist/assets"
          ),
        ],
      }
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
            });
          }
          break;

        case "CreateFile":
          {
            let buf = new Uint8Array();
            let duri = vscode.Uri.file(data.directory + "\\" +  data.value);
            let throw_away = await vscode.workspace.fs.writeFile(duri, buf);
            const openPath = vscode.Uri.parse(duri);
            vscode.workspace
              .openTextDocument(openPath)
              .then((document) => {
                vscode.window.showTextDocument(document);
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
      }
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
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

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
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
            });
          }
          break;

        case "CreateFile":
          {
            console.log("data.value - ", data.value);
            vscode.workspace
              .openTextDocument("untitled:" + data.value)
              .then((document) => {
                vscode.window.showTextDocument(document);
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
                this._view?.webview.postMessage({
                  command: "directory_change",
                  data: JSON.stringify(result),
                });
              }
            }
          );

          break;
        }
      }
    });
  }

  public addColor() {
    if (this._view) {
      this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
      this._view.webview.postMessage({ type: "addColor" });
    }
  }

  public clearColors() {
    if (this._view) {
      this._view.webview.postMessage({ type: "clearColors" });
    }
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
