import { Component, ElementRef, OnInit, ViewChild, OnDestroy, ViewEncapsulation, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorView } from '@codemirror/view';
import {
  EditorBlock,
  CodeMirrorCallbacks,
  addBlockEffect,
  updateBlockEffect, 
  createEditorState,
  getEditorData
} from './editor-core';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EditorComponent implements OnInit, OnDestroy, CodeMirrorCallbacks {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef;
  private view!: EditorView;

  // 弹窗状态
  showPopup = false;
  popupStyle = { top: '0px', left: '0px' };
  editingBlock: EditorBlock = { id: '', placeholder: '', presetText: '' };
  allBlocks: Map<string, EditorBlock> = new Map();

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

    // 同步到 allBlocks 以便后续弹窗读取
    initialBlocks.forEach(item => this.allBlocks.set(item.block.id, item.block));

    const initialState = createEditorState('# 角色\n\n你是一个 ', this, initialBlocks);
    
    this.view = new EditorView({
      state: initialState,
      parent: this.editorHost.nativeElement
    });
  }

  updateBlockText(id: string, text: string) {
    const block = this.allBlocks.get(id);
    if (block) {
      block.presetText = text;
      this.allBlocks.set(id, block);
      // 同步到当前编辑中的块
      if (this.showPopup && this.editingBlock.id === id) {
        this.editingBlock.presetText = text;
      }
    }
  }

  openPopup(id: string, rect: DOMRect) {
    const block = this.allBlocks.get(id);
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
    // 如果点击了弹窗外部，关闭弹窗
    // 这里弹窗内部已经 stopPropagation 了，所以只要进到这里且 showPopup 为 true 就可以认为点击了外部
    if (this.showPopup) {
      this.closePopup();
    }
  }

  addBlock() {
    const newBlock: EditorBlock = {
      id: Math.random().toString(36).substr(2, 9),
      placeholder: '请输入编辑块内容为空时的提示文案',
      presetText: ''
    };
    this.allBlocks.set(newBlock.id, newBlock);
    this.view.dispatch({
      effects: addBlockEffect.of(newBlock)
    });
    this.view.focus();
  }

  syncBlock() {
    if (this.editingBlock.id) {
      const updatedBlock = { ...this.editingBlock };
      this.allBlocks.set(updatedBlock.id, updatedBlock);
      
      // 实时同步到 CodeMirror 视图
      this.view.dispatch({
        effects: updateBlockEffect.of(updatedBlock)
      });
    }
  }

  closePopup() {
    this.showPopup = false;
  }

  onConfirm() {
    const data = getEditorData(this.view, this.allBlocks);
    console.log('--- Editor Data (JSON) ---');
    console.log(JSON.stringify(data.json, null, 2));
    console.log('--- Editor Data (HTML) ---');
    console.log(data.html);
  }

  ngOnDestroy() {
    if (this.view) {
      this.view.destroy();
    }
  }
}
