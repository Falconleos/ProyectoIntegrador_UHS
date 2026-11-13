import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomAttentionGlobalListComponent } from './room-attention-global-list.component';

describe('RoomAttentionGlobalListComponent', () => {
  let component: RoomAttentionGlobalListComponent;
  let fixture: ComponentFixture<RoomAttentionGlobalListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomAttentionGlobalListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomAttentionGlobalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
