import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { MarkdownRenderChild } from "obsidian";
import { WidgetType } from "@codemirror/view"
import { EditorView, Decoration } from "@codemirror/view"
import { ViewUpdate, ViewPlugin, DecorationSet } from "@codemirror/view"
import { Extension } from "@codemirror/state"
import * as CodeMirror from 'codemirror';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	private editorExtension: Extension[] = [];
	settings: MyPluginSettings;

	updateEditorExtension() {
		// Empty the array while keeping the same reference
		// (Don't create a new array here)
		this.editorExtension.length = 0;
	
		// Create new editor extension
		let myNewExtension = this.createEditorExtension();
		// Add it to the array
		this.editorExtension.push(myNewExtension);
	
		// Flush the changes to all editors
		this.app.workspace.updateOptions();
	}

	async onload() {
		this.registerEditorExtension(this.editorExtension);
		// this.registerCodeMirror((cm) => {
		// 	console.log("reg CM");
		// 	const pos = cm.getCursor();
		// 	cm.addWidget(pos, document.createElement("div"), false);
		// 	// cm.sta
		// });


		
		this.registerMarkdownPostProcessor((element, context) => {
			// const codeblocks = element.querySelectorAll("code");

			// for (let index = 0; index < codeblocks.length; index++) {
			//   const codeblock = codeblocks.item(index);
			//   const text = codeblock.innerText.trim();
			//   const isEmoji = text[0] === ":" && text[text.length - 1] === ":";

			//   if (isEmoji) {
			// 	context.addChild(new Emoji(codeblock, text));
			//   }
			// }

			console.log(element);

		});

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export class Emoji extends MarkdownRenderChild {
	static ALL_EMOJIS: Record<string, string> = {
		":+1:": "👍",
		":sunglasses:": "😎",
		":smile:": "😄",
	};

	text: string;

	constructor(containerEl: HTMLElement, text: string) {
		super(containerEl);

		this.text = text;
	}

	onload() {
		const emojiEl = this.containerEl.createSpan({
			text: Emoji.ALL_EMOJIS[this.text] ?? this.text,
		});
		this.containerEl.replaceWith(emojiEl);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

class CheckboxWidget extends WidgetType {
	constructor(readonly checked: boolean) { super() }

	eq(other: CheckboxWidget) { return other.checked == this.checked }

	toDOM() {
		let wrap = document.createElement("span")
		wrap.setAttribute("aria-hidden", "true")
		wrap.className = "cm-boolean-toggle"
		let box = wrap.appendChild(document.createElement("input"))
		box.type = "checkbox"
		box.checked = this.checked
		return wrap
	}

	ignoreEvent() { return false }
}


function checkboxes(view: EditorView) {
	let widgets = []
	for (let { from, to } of view.visibleRanges) {
		// if (type.name == "BooleanLiteral") {
		let isTrue = view.state.doc.sliceString(from, to) == "true"
		let deco = Decoration.widget({
			widget: new CheckboxWidget(isTrue),
			side: 1
		})
		widgets.push(deco.range(to))
		// }
	}
	return Decoration.set(widgets)
}

const checkboxPlugin = ViewPlugin.fromClass(class {
	decorations: DecorationSet

	constructor(view: EditorView) {
		this.decorations = checkboxes(view)
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged)
			this.decorations = checkboxes(update.view)
	}
}, {
	decorations: v => v.decorations,

	eventHandlers: {
		mousedown: (e, view) => {
			let target = e.target as HTMLElement
			if (target.nodeName == "INPUT" &&
				target.parentElement!.classList.contains("cm-boolean-toggle"))
				return toggleBoolean(view, view.posAtDOM(target))
		}
	}
})

function toggleBoolean(view: EditorView, pos: number) {
	let before = view.state.doc.sliceString(Math.max(0, pos - 5), pos)
	let change
	if (before == "false")
		change = { from: pos - 5, to: pos, insert: "true" }
	else if (before.endsWith("true"))
		change = { from: pos - 4, to: pos, insert: "false" }
	else
		return false
	view.dispatch({ changes: change })
	return true
}

