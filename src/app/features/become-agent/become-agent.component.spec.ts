import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BecomeAgentComponent } from './become-agent.component';

describe('BecomeAgentComponent', () => {
  let component: BecomeAgentComponent;
  let fixture: ComponentFixture<BecomeAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BecomeAgentComponent,
        RouterTestingModule
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BecomeAgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
