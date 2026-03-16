import { Component, ElementRef, OnInit, ViewChild, OnDestroy, ViewEncapsulation, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorView } from '@codemirror/view';
import {
  EditorBlock,
  CustomEditor,
  CustomEditorOptions
} from './editor-core';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EditorComponent implements OnInit, OnDestroy {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef;
  private editor!: CustomEditor;

  // 弹窗状态
  showPopup = false;
  popupStyle = { top: '0px', left: '0px' };
  editingBlock: EditorBlock = { id: '', placeholder: '', presetText: '' };

  // 插件弹窗状态
  showPluginPopup = false;
  pluginPopupStyle = { top: '0px', left: '0px' };
  plugins = [
    { id: 'plugin-1', name: 'LinkReaderPlugin', type: 'plugin' as const },
  ];
  workflows = [
    { id: 'workflow-1', name: 'condition_1_872', type: 'workflow' as const },
  ];
  private pluginTriggerPos: number = 0;

  ngOnInit() {
    const initialBlocks = [
      {
        pos: 11,
        block: {
          id: 'init-block-1',
          placeholder: '请输入...',
          presetText: '智能助手'
        }
      }
    ];

    const options: CustomEditorOptions = {
      parent: this.editorHost.nativeElement,
      initialDoc: '# 角色\n\n你是一个  ',
      initialBlocks,
      onOpenPopup: (id, rect) => this.openPopup(id, rect),
      onTriggerPluginPopup: (pos) => this.openPluginPopup(pos),
      onBlockUpdated: (id, text) => {
        if (this.showPopup && this.editingBlock.id === id) {
          this.editingBlock.presetText = text;
        }
      }
    };

    this.editor = new CustomEditor(options);
  }

  openPopup(id: string, rect: DOMRect) {
    const block = this.editor.getBlock(id);
    if (block) {
      this.editingBlock = { ...block };
      this.showPopup = true;
      // 计算弹窗位置（简单逻辑：在 block 下方）
      const editorRect = this.editorHost.nativeElement.getBoundingClientRect();
      this.popupStyle = {
        top: `${rect.bottom - editorRect.top + 10}px`,
        left: `${rect.left - editorRect.left}px`
      };
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent) {
    if (this.showPopup || this.showPluginPopup) {
      this.closePopup();
    }
  }

  openPluginPopup(pos: number) {
    this.pluginTriggerPos = pos;
    const coords = this.editor.view.coordsAtPos(pos);
    if (coords) {
      const editorRect = this.editorHost.nativeElement.getBoundingClientRect();
      this.pluginPopupStyle = {
        top: `${coords.bottom - editorRect.top + 10}px`,
        left: `${coords.left - editorRect.left}px`
      };
      this.showPluginPopup = true;
    }
  }

  addPluginBlock(item: { id: string, name: string, type: 'plugin' | 'workflow' }) {
    this.editor.addPluginBlock(this.pluginTriggerPos, item);
    this.closePopup();
  }

  addBlock() {
    this.editor.addBlock();
  }

  syncBlock() {
    if (this.editingBlock.id) {
      this.editor.syncBlock(this.editingBlock);
    }
  }

  closePopup() {
    this.showPopup = false;
    this.showPluginPopup = false;
  }

  onConfirm() {
    const data = this.editor.getData();
    console.log('--- Editor Data (JSON) ---');
    console.log(JSON.stringify(data.json, null, 2));
    console.log('--- Editor Data (HTML) ---');
    console.log(data.html);
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.destroy();
    }
  }
}
