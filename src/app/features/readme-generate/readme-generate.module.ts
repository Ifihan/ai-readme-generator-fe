import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadmeGenerateComponent } from './readme-generate.component';
import { RouterModule } from '@angular/router';

@NgModule({

  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: ReadmeGenerateComponent }
    ]),
  ],
})
export class ReadmeGenerateModule { }
