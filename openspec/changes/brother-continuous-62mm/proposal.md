# Continuous 62 mm Brother stock

The printer status screenshot identifies physical stock as 62 mm continuous tape. The earlier 17 x 54 value was a driver selection, not the installed stock; supersedes brother-17x54-stickers.

The PDF MUST be 62 x 35 mm, retaining the original detailed layout. QZ MUST request custom paper width 62 mm across the roll and length 35 mm, without swapping dimensions. Use portrait PageFormat to retain these physical axes (the PDF itself is landscape). Density MUST remain 300/25.4 dots/mm. Development A4 bounds MUST match 62 x 35 mm.

Validate one-page PDF dimensions and content, printer configuration, nine targeted tests, rendered PDF, build and deployed image. Physical roll/cut validation remains with the operator. Rollback: frontend image d326d2792df53f5e11c1144919d7566a2a885f69; no migration.

Physical validation: operator confirms printing on continuous tape, but the header is clipped. Move the content block down 2 mm and place the footer 4.5 mm above the lower edge. Preserve font sizes, paper dimensions and QZ settings. Render short/long examples before release.
