import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss']
})
export class AdminLayout implements OnInit {
  public sidebarColor: string = 'blue';

  ngOnInit(): void {
    const sidebar = document.getElementsByClassName('sidebar')[0];
    const mainPanel = document.getElementsByClassName('main-panel')[0];
    if (sidebar) sidebar.setAttribute('data', this.sidebarColor);
    if (mainPanel) mainPanel.setAttribute('data', this.sidebarColor);
  }
}
