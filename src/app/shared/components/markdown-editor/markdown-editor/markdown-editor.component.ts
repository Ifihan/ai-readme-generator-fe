import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as showdown from 'showdown';

@Component({
  selector: 'app-markdown-editor',
  imports: [CommonModule, FormsModule],
  templateUrl: './markdown-editor.component.html',
  styleUrl: './markdown-editor.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true
    }
  ],
  standalone: true
})
export class MarkdownEditorComponent implements ControlValueAccessor {
  @Input() placeholder: string = 'Edit your markdown content here...';
  @Input() originalContent: string = '';
  @Input() showPreview: boolean = true;
  @Input() minHeight: string = '400px';
  @Output() contentChanged = new EventEmitter<string>();
  @Output() resetRequested = new EventEmitter<void>();

  content: string = '';
  viewMode: 'preview' | 'edit' = 'preview';
  private converter: showdown.Converter;

  constructor(private sanitizer: DomSanitizer) {
    // Configure showdown for GitHub-flavored markdown
    this.converter = new showdown.Converter({
      tables: true,
      strikethrough: true,
      ghCodeBlocks: true,
      tasklists: true,
      ghMentions: false,
      smartIndentationFix: true,
      openLinksInNewWindow: false,
      backslashEscapesHTMLTags: true,
      emoji: true,
      underline: false,
      simpleLineBreaks: true,
      requireSpaceBeforeHeadingText: false
    });
  }

  private onChange = (value: string) => { };
  private onTouched = () => { };

  get hasContentChanged(): boolean {
    return this.originalContent !== this.content;
  }

  get characterCount(): number {
    return this.content.length;
  }

  get renderedMarkdown(): SafeHtml {
    if (!this.content) return '';

    try {
      const html = this.converter.makeHtml(this.content);
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (error) {
      console.error('Error rendering markdown:', error);
      return this.sanitizer.bypassSecurityTrustHtml('<p>Error rendering markdown</p>');
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.content = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handle disabled state if needed
  }

  onContentChange(): void {
    this.onChange(this.content);
    this.contentChanged.emit(this.content);
    this.onTouched();
  }

  onBlur(): void {
    this.onTouched();
  }

  resetToOriginal(): void {
    this.content = this.originalContent;
    this.onChange(this.content);
    this.resetRequested.emit();
  }

  switchToPreview(): void {
    this.viewMode = 'preview';
  }

  switchToEdit(): void {
    this.viewMode = 'edit';
  }
}
