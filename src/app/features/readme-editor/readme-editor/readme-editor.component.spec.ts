import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadmeEditorComponent } from './readme-editor.component';

describe('ReadmeEditorComponent', () => {
  let component: ReadmeEditorComponent;
  let fixture: ComponentFixture<ReadmeEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadmeEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReadmeEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
