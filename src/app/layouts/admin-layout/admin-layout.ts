import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss'
})
export class AdminLayout implements OnInit {

  public sidebarColor: string = "blue";

  constructor() { }

  ngOnInit() {
    var sidebar = document.getElementsByClassName('sidebar')[0];
    var mainPanel = document.getElementsByClassName('main-panel')[0];
    sidebar.setAttribute('data', this.sidebarColor);
    mainPanel.setAttribute('data', this.sidebarColor);
  }


}
