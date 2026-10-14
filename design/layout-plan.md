# Layout plan

How each shared section behaves at the five breakpoints from the October 2026 design review (480, 768, 900, 1024, 1366 px). Every section is one component in `src/styles/kit.css`; pages compose them and don't override them.

## System

| Token | Value |
| --- | --- |
| Type | Archivo (variable). Headings at 80% width, body at 100% |
| Colour | Graphite `#15171A`, warm grey `#F2F1EE`, text `#1B1D21`, one accent: safety orange `#F26A1B`, for the main action only |
| Card padding | 24 px (20 px under 480) |
| Gap | 16 px between cards, 24 px between a heading and its grid |
| Radii | 6 px small (inputs, tags), 14 px card, 999 px pill |
| Section spacing | 96 px at 1366, 80 at 1024, 72 at 900/768, 56 at 480 |

Eyebrow labels are removed. A section is a heading, an optional subheading and body. A pill is used only where it carries information (a status, a language, a price unit).

## Header (one style everywhere)

Solid graphite with a light blur. Logo left, nav centre, a quiet "Ask" button and one orange "Book a demo" on the right.

| Width | Layout |
| --- | --- |
| 1366 | Full nav, Ask, Book a demo |
| 1024 | Full nav with tighter gaps, Ask, Book a demo |
| 900 | Nav moves into the menu; Book a demo stays visible beside the menu button |
| 768 | Same as 900 |
| 480 | Logo mark plus name, Book a demo shortens to "Demo", menu button |

## Hero A: dark split (home)

| Width | Layout |
| --- | --- |
| 1366 | Text left (6 of 12 columns), twin render right, the plan card overlapping the image's lower right edge, never the arm |
| 1024 | Same split at 6/6; the plan card shrinks to 340 px and sits below the arm's base |
| 900 | Text on top, full width. The image follows at 16:9, with the plan card below it, not on it |
| 768 | Same as 900 |
| 480 | Text, then the image at 4:3, then the plan card full width |

## Hero B: light, left-aligned (every other page)

| Width | Layout |
| --- | --- |
| 1366 and 1024 | Heading and subheading in 7 columns; an optional image or render to the right in 5 |
| 900 and 768 | Single column; the image follows the text |
| 480 | Single column; the heading drops a size step |

## Feature row (four items: home)

| Width | Layout |
| --- | --- |
| 1366 | 4 across, custom icon above a one-line title |
| 1024 | 2 by 2, so titles never wrap |
| 900, 768 | 2 by 2 |
| 480 | 1 column, icon beside the title |

## Steps (How Kata works)

| Width | Layout |
| --- | --- |
| 1366 | 4 across, status rows instead of code |
| 1024, 900 | Horizontal scroll strip of 4 cards at 300 px, with the next card peeking. No 2 by 2 |
| 768, 480 | Vertical list; number on the left, text on the right |

## Plan card (Product)

One checklist grouped Plan, Checks, Approval. Every row has a state (done, waiting, locked). Approval is the last row and the visual end of the card.

| Width | Layout |
| --- | --- |
| 1366, 1024 | Card left (5 columns), twin render right (7 columns); hovering a row shows that moment in the render |
| 900 | Card left, render right at 1:1 |
| 768, 480 | Card first, render after it. The plan always comes before the picture it explains |

## Pricing

One price per robot cell, set against a render of a cell, with the payback figures from the ROI model beside it. The pilot and the enterprise options sit below as two short rows.

| Width | Layout |
| --- | --- |
| 1366, 1024 | Price block left, cell render right, payback strip under both |
| 900, 768 | Price block, then the render, then the payback strip |
| 480 | Same order; nothing floats over the price or its button |

## FAQ

No accordion. Short answers shown open, in three groups: operators, engineers, finance. Two columns from 900 up, one below.

## Backgrounds

Home: graphite hero and conveyor scene, then one long warm-grey band for everything else, then the graphite footer. Other pages: warm grey throughout, with at most one graphite band.
