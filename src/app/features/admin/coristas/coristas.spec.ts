import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Coristas } from './coristas';

describe('Coristas', () => {
  let component: Coristas;
  let fixture: ComponentFixture<Coristas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Coristas],
    }).compileComponents();

    fixture = TestBed.createComponent(Coristas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
