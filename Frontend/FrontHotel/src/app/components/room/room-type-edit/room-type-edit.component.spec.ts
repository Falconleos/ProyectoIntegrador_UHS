import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomTypeEditComponent } from './room-type-edit.component';

describe('RoomTypeEditComponent', () => {
  let component: RoomTypeEditComponent;
  let fixture: ComponentFixture<RoomTypeEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomTypeEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomTypeEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
