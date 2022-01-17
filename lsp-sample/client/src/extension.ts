/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext, TextDocument, ViewColumn, TextDocumentChangeEvent, TextEditorEdit } from 'vscode';
import { commands, window, TextEditor, TextDocumentContentProvider, EventEmitter, Uri, Range } from 'vscode';

import * as cp from 'child_process';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

// The editor for surface language source editing.
let surfaceEditor: TextEditor;

// The (read-only) editor that displays desugar result.
let desugarEditor: TextEditor;

const desugarScheme = 'desugar';
const desugarUri = Uri.parse(desugarScheme + ':Desugar Result');
const desugarProvider = new class implements TextDocumentContentProvider {

	// content
	content = '';

	// emitter and its event
	onDidChangeEmitter = new EventEmitter<Uri>();
	onDidChange = this.onDidChangeEmitter.event;

	provideTextDocumentContent(uri: Uri): string {
		// simply invoke cowsay, use uri-path as text
		return this.content;
	}
};

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'plaintext' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'languageServerExample',
		'Language Server Example',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();

	// Register the content provider.
	workspace.registerTextDocumentContentProvider(desugarScheme, desugarProvider);

	// Create the editor for writing surface language program.
	// workspace.openTextDocument({ content: '' }).then((doc: TextDocument) => {
	// 	window.showTextDocument(doc, { preview: false }).then((editor: TextEditor) => {
	// 		surfaceEditor = editor;
	// 	}, (reason) => {
	// 		window.showErrorMessage(reason);
	// 	});
	// });

	// Create the editor for desugar result.
	workspace.openTextDocument(desugarUri).then((doc: TextDocument) => {
		window.showTextDocument(doc, { preview: false, viewColumn: ViewColumn.Beside }).then((editor: TextEditor) => {
			desugarEditor = editor;
		});
	});

	// Register document editing event.
	workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => {
		// For now, the surface program filename must be 'Surface Program'. Needs to be changed later.
		if (e.document.fileName.endsWith('Surface Program')) {
			desugarAndShow(e.document.getText());
		}
	});

	// Deactivate the extension if the surface program editor is closed.
	workspace.onDidCloseTextDocument((doc: TextDocument) => {
		if (doc.fileName === 'Surface Program') {
			client.stop();
		}
	});
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

function updateDesugarEditor(text: string): void {
	desugarProvider.content = text;
	desugarProvider.onDidChangeEmitter.fire(desugarUri);
}

function desugarAndShow(prog: string): void {
	// For demonstration purpose only!
	const proc = cp.exec('java Desugar', { cwd: '/home/dev-xys/vscode-extension-samples/lsp-sample/java' }, (error: cp.ExecException, stdout: string, stderr: string) => {
		if (error) {
			window.showErrorMessage(error.message);
			return;
		}
		if (stdout !== 'null\n') {
			updateDesugarEditor(stdout);
		}
	});
	proc.stdin.write(prog);
	proc.stdin.end();
}
