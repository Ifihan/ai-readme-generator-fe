import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepositorySelectionComponent } from './repository-selection.component';

describe('RepositorySelectionComponent', () => {
  let component: RepositorySelectionComponent;
  let fixture: ComponentFixture<RepositorySelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepositorySelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepositorySelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
