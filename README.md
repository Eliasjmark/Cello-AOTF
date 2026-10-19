# Cello: Ashes of the Fallen

Ett 3D-äventyr i världen The Shattered Realm, flytande öar i en evig storm, byggt med [Three.js](https://threejs.org) och spelbart direkt i webbläsaren.

**Version:** prototyp 0.5 · speltest och finslipning (fas 0–5 i utvecklingsplanen)

Spelet är på engelska. Kommentarerna i koden och den här filen är på svenska.

## Spela

Spelet behöver ingen installation, bara en enkel webbserver (webbläsare tillåter inte moduler från `file://`).

```bash
npm start            # startar en server på http://localhost:8080
```

Alternativt: aktivera **GitHub Pages** för repot (Settings → Pages → Deploy from branch → `main` / root), så går spelet att spela på `https://<användarnamn>.github.io/<repo>/`.

En fristående version (en enda HTML-fil med all kod) byggs med:

```bash
npm install          # en gång, hämtar esbuild
npm run build:artifact   # → build/play.html
```

## Vad är nytt i 0.5

- **Musik:** soundtracket *Hearth of the Hollow* (Treblo) ersätter den genererade musiken. Varje plats och händelse har sitt spår (se tabellen nedan). Spåren tonar in i varandra och platsspår fortsätter där de slutade. `N` slår av och på musiken.
- **Nya modeller:** Cello, folket i Aetheria och asklingarna är formade låg-polyfigurer med knän, armbågar, ansikten och kläder. Cello blinkar, vänder huvudet mot fienden vid lock-on och hans halsduk och tunika rör sig när han springer.
- **Krukor** i fästningen och byn som går sönder av svärdet eller hammaren, och ibland ger ett hjärta.
- **Kameran** backar och lyfts när Cello låser fast på en stor fiende, och går lite närmare inne i fästningen.
- **Hrungnir** tål lite mer (18 i stället för 15).
- Rörliga delar av figurerna slås ihop per led, så att de nya modellerna inte gör spelet långsammare.

### Musiken

| Plats eller händelse | Spår |
| --- | --- |
| Titelskärmen | Hymn of the Wandering Hero |
| Lägret i skogen | Morning in Willowmere |
| Vägen hem efter vrålet, och när Cello bär Maren | Whispers of the Hollow Woods |
| Den brinnande byn (prologen) | Fields at Dawn |
| Byn efteråt | Fields of the Forgotten Crown, och Village at First Light när Hrungnir är besegrad |
| Aetheria | The Hearth and the Meadow |
| Lyras berättelse om titanerna | The Quiet Hour Before Quest |
| Stenporten och stormstenen vaknar | Ballad of the Wandering Hero |
| Öppna världen norrut och söderut | The Green Road Calls |
| Öppna världen österut | Gallop Across the Wildlands |
| The Tempest Bastion | The Hollow Mask Watches |
| Järnväktaren | March of the Hollow Crown |
| Titanen i prologen och Hrungnir | The Warlord's Approach |
| Segern och vägen hem | Dawn Over the Kingdom |

Spåren ligger i `music/` (128 kbit/s MP3). När spelet publiceras som artifact skickas de med som separata filer.

## Kontroller

| Tangent | Gör |
| --- | --- |
| W A S D | Spring (C växlar till att gå) |
| Mus | Kamera (första klicket låser musen, Esc släpper) |
| Space | Hoppa |
| Shift | Rulla, sidohopp och bakåtvolt vid lock-on |
| Vänsterklick | Svärd, tre slag i rad |
| Högerklick / R | Sköld |
| Q / mittenklick | Lås fast på fiende |
| E | Prata, öppna kistor, läsa, låsa upp dörrar |
| F | Mjölnirs skärva: markslag |
| G | Mjölnirs skärva: tung vikt av/på |
| K / Tab | Karta (pausar spelet) |
| M · N · P · H · I | Ljud · musik · retroläge · dölj hjälpen · felsökningsinfo |

Handkontroll: A hopp, X svärd, B rulla, RT sköld, LT lås, Y prata, RB markslag, LB tung vikt, Back karta.
På mobil styr vänster halva av skärmen Cello och höger halva kameran; knapparna sitter nere till höger.

## Vad finns i 0.4

- **Vägen hem.** Spelet börjar på lägret i skogen söder om byn. Cello går hem över två broar, hör ett vrål, och vid byns port visar kameran att allt brinner.
- **Större öar.** Byn, Aetheria och de andra öarna är ungefär dubbelt så stora, med fler brända hus, eldar och rökpelare.
- **Stenvägen norrut.** Efter samtalet om titanerna väcker Lyra stenporten i norr, och en väg av flytande stenar reser sig mot fästningen.
- **The Tempest Bastion** – den första fästningen (dungeon), med nio rum, karta, små nycklar och en Stormnyckel:
  - **Förhallen** med kartkistan och en kopparplatta som leder till vindbryggan.
  - **Vaktsalen**, ett fällrum där gallret slår igen tills alla fiender är besegrade.
  - **Smideshallen** med minibossen **Järnväktaren** (en jättelik askling med sköld och yxa) och Mjölnirs skärva.
  - **Kondensatorrummet**: två plattor måste få blixt nästan samtidigt för att buren kring en kista ska lyftas. Här finns också smedens verkstad och ett brev.
  - **Vindbryggan**: en smal bro där stormen blåser Cello ner, om han inte bär hammaren tungt.
  - **Den spräckta salen**: golvet brister under tung vikt, och i **källaren** ligger Stormnyckeln. En lucka leder upp igen.
  - **Hrungnirs krets**: bossen **Hrungnir**, jätten med hjärta av sten. Bara blixten från de fyra stormpelarna får honom på knä.
- **Mjölnirs skärva:** markslaget (F) skickar blixt genom kopparrännor, krossar sköldar och skadar bossar; tung vikt (G) gör Cello tung och långsam men orubblig i stormen.
- **Fiender:** asklingar, sköldvakter (skölden tar emot svärdet men krossas av hammaren) och stormfladdrare.
- **Föremålsfanfar** när Cello hittar något, en **hjärtbehållare** efter bossen, och en virvel som bär honom hem.
- **Stormstenen i öster:** slå på kopparplattan med hammaren, så reser sig en stenväg mot udden, där nästa område skymtar.
- **Brevet till Kael:** valet i prologen avgör vad Kael säger, och om Cello får smedens handskar (snabbare markslag).
- **Karta (K)** över fästningen, eller över öarna när Cello är utomhus.
- Sparning sker automatiskt vid viktiga händelser; dör Cello i fästningen börjar han om vid ingången.

## Kodens delar

| Fil | Innehåll |
| --- | --- |
| `src/main.js` | Startar allt, spelslingan, avståndsgallring av saker långt bort |
| `src/world.js` | Öarna, byn, Aetheria, broar, eldar, stenvägarna |
| `src/bastion.js` | The Tempest Bastion: rum, dörrar, kistor, kretsar, pussel, fällor och bossarna |
| `src/bosses.js` | Järnväktaren och Hrungnir |
| `src/enemies.js` | Asklingar, sköldvakter och stormfladdrare |
| `src/player.js` | Cello: rörelse, svärd, sköld, hammaren, tung vikt |
| `src/story.js` | Berättelsen, samtal, val, föremål och sparning |
| `src/collide.js` | Kollisioner mot världen plus rörliga lådor (dörrar, stenar, golv) |
| `src/lights.js` | En pool med åtta punktljus som flyttas till eldarna närmast Cello |
| `src/items.js` | Föremålens modeller och texter |
| `src/map.js` | Kartan |
| `src/geom.js` | Gemensamma geometrihjälpare och sammanslagning av statiska föremål |
| `src/audio.js` | Alla ljudeffekter, skapade med Web Audio |
| `src/music.js` | Musiken: vilket spår som spelas, övertoningar och sänkning under samtal |
| `src/pots.js` | Krukor som går sönder och ibland ger hjärtan |
| `src/hud.js`, `src/dialog.js`, `src/input.js`, `src/cameraRig.js`, `src/combat.js`, `src/effects.js`, `src/npcs.js`, `src/sky.js`, `src/textures.js`, `src/titan.js` | Gränssnitt, textrutor, styrning, kamera, strid, effekter, folk, himmel, texturer och titanen |

Three.js r186 ligger i `lib/three` så att spelet fungerar utan internet.
