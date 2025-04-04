import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadmeGenerationComponent } from './readme-generation.component';

describe('ReadmeGenerationComponent', () => {
  let component: ReadmeGenerationComponent;
  let fixture: ComponentFixture<ReadmeGenerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadmeGenerationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReadmeGenerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
