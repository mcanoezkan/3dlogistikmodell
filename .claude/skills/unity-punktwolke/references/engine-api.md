# Engine-API für eigene Szenen

Eine Folie ist ein Objekt in `SLIDES`:

```js
SLIDES.push({lab:'Kurzname', t:'Titel mit <em>Akzent</em>', s:'Untertitel', idx:'optional',
  cam:{x,y,z,yaw,pitch,d,sway},          // Kameraziel, Drehung (rad), Abstand-Faktor, Schwanken
  init:()=>({sel:0}),                     // Zustand der Folie (bleibt beim Zurückblättern erhalten)
  leave(st){},                            // optional beim Verlassen
  build(B,st){ ... }});                   // baut die Szene; nach Zustandsänderung refresh() aufrufen
```

`build` läuft bei jedem `refresh()` neu. Gruppen mit gleichem Schlüssel behalten ihre Partikel → weiche Übergänge (z. B. Inseln morphen zum Ring, wenn nur die Punkte wechseln).

## Punkte erzeugen: `new PB(seed)`

`sphere(cx,cy,cz,r,n)` Oberfläche · `ball(..)` Volumen · `cloud(cx,cy,cz,sx,sy,sz,n)` Gauß · `ring(cx,cy,cz,r,n,dicke,'xy'|'xz'|'yz',a0,a1)` · `disc(..)` · `seg(a,b,n,jitter)` Linie · `rect(x,y,w,h,n,z)` · `fill(x,y,w,h,n,z,dz)` · `box(x0,y0,z0,x1,y1,z1,n)` Flächen · `edges(..)` Kanten · `text(str,cx,cy,höhe,n,cz,dz,gewicht,schrift)` Punktschrift · `curve(pts,n)`.
Fertige Formen: `figure(b,cx,cy,cz,skala,n)` Person · `chaosPts(seed,r,n)` · `crystalPts(seed,r,n)` · `cubePts(seed,s,n)`. Kurven: `crv(stützpunkte)` Catmull-Rom, `arc(a,b,höhe)`, `ringPath(R,n,'xz')`.

## Szene bauen (`B`)

| Aufruf | Zweck |
|---|---|
| `B.g(key, pb, opt)` | Punktgruppe |
| `B.path(key, punkte, n, opt)` | Partikel fließen entlang Polylinie (`speed`, `spread`, `closed`, `fade`) |
| `B.lab(key, pos, html, opt)` | Beschriftung im Raum |
| `B.hot(key, pos, radius, opt)` | Klickfläche: `click`, `grp:[keys]` (leuchten beim Hover), `drag(q)` (Weltpunkt) |
| `B.ln(a, b, farbe, alpha)` | feste Linie |
| `B.dyn=(T,dt,st)=>{}` | pro Bild: Animation, `L(a,b,farbe,alpha)` für Linien, `RG(key)` Gruppe ändern |
| `B.cap={k,n,t,s,list,chips}` | Detailfeld unten links (`list` Einträge auch `{h,c:'p'}` für Pain) |
| `B.act=[{t,on,f}]` | Schaltflächen oben rechts |
| `B.note`, `B.hint`, `B.t`, `B.s`, `B.hero` | Kernaussage, Hinweis, Titel überschreiben, Titelfolien-Block |

**Gruppen-Optionen**: `col` (Farbe aus `C`), `gain` (Helligkeit, 0,1 … 1,6), `size` (Punktgröße in Welteinheiten, Standard 0,034; 0,02–0,03 üblich), `pos`, `rot:[x,y,z]`, `spin:[x,y,z]` rad/s, `scale`, `lo` (lokale Verschiebung vor Drehung, z. B. Ebene herausheben), `jit` (Zittern = Chaos), `stiff` (Federhärte), `tw` (Funkeln), `pc:(l,T,g)=>faktor` Helligkeit je Punkt (Fortschritt, Messuhr), `pm:(l,V,T,g)=>{V[0]=…}` Position je Punkt (Morphing nach Zustandswert, z. B. Anteil Mensch/KI).

**Beschriftungs-Optionen**: `al` Ausrichtung `'l'|'r'|'a'(über)|'b'(unter)|'c'|'lt'|'lb_'` · `w` Breite in Welteinheiten · `cls` (`'sel'`, `'dim'`, `'ghost'`, `'off'`, `'pain'`, `'c'`, auch als Funktion) · `click`, `hk` (zugehöriger Hotspot) · `dx`,`dy` (Versatz in % der Breite) · `vis:(T,w)=>bool`.
`pos` überall: `[x,y,z]` · `()=>[x,y,z]` (bewegt) · `{g:'key',p:[lokal]}` (folgt einer Gruppe samt Drehung).

**HTML-Bausteine**: `Ht(t,d,n)` Großbuchstaben-Titel, `H2(t,d,n)` Satz-Titel, Klassen `.big` `.mid` `.k` (Kicker) `.d` (Text) `.n` (Nummer) `.tag` `.q`.

**Farben `C`**: `w lg bg blue petrol sky green acc mint pain red yel dim ice`; Ampel `AMPC[1..4]`.

## Regeln

- Gesamtpunkte ≤ ~41 000 je Folie; Rest wird Hintergrundstaub. Große Formen 1 000–8 000, Knoten 300–700.
- Seeds je Gruppe fest wählen (stabile Formen bei `refresh`).
- Animationen in `B.dyn`, nicht per `setInterval`; zeitgesteuerte Abläufe prüfen `SID` (Folie noch aktiv?).
- Interaktive Zustände in `st` halten; nach Änderung `refresh()`.
