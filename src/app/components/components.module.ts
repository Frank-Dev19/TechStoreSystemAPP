import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
//import { NgbModule } from "@ng-bootstrap/ng-bootstrap";

import { Footer } from "./footer/footer";
import { Navbar } from "./navbar/navbar";
import { Sidebar } from "./sidebar/sidebar";

@NgModule({
    imports: [CommonModule, RouterModule],
    declarations: [Footer, Navbar, Sidebar],
    exports: [Footer, Navbar, Sidebar]
})
export class ComponentsModule { }
