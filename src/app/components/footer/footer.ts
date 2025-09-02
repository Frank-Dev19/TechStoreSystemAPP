import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: false,
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  test: Date = new Date();

  constructor() { }

  ngOnInit() { }
}
