/* ============================================================================
   Twins Disney Trip 2026 — park maps.

   The images in /maps are the map halves of Disney's own paper guidemaps,
   cut out of the PDFs: page 2 of each guidemap, cropped at the gutter so only
   the illustration survives (the numbered attraction lists and the legend are
   dropped). Two sizes ship for each park:

     <park>-sm.webp    ~780px — cached by the service worker, paints instantly
     <park>-full.webp  native — swapped in once it arrives, what you zoom into

   `img.w` / `img.h` are the pixel dimensions of the FULL image. They set the
   aspect ratio, which is all the pin maths needs.

   HOW TO EDIT
   -----------
   Every pin lives in `places`. Coordinates are fractions of the image:
   x = 0 is the left edge, x = 1 the right; y = 0 is the top, y = 1 the bottom.
   To find them, open the map, zoom to the spot and read the position off —
   or measure on the source image and divide by its width/height.

     { id: 'tron', name: 'TRON Lightcycle / Run', land: 'Tomorrowland',
       x: 0.925, y: 0.285 }

   An agenda item is tied to a pin in one of two ways:

     1. `place: 'tron'` on the item in data.js — always wins, use it when the
        agenda wording differs from the attraction name.
     2. Otherwise the item title is matched against each place's `name` and
        `alias` list. EXACT matches only (case, quotes and punctuation are
        ignored), so "Space Mountain" finds its pin on its own and nothing
        is ever tied to the wrong ride by accident.

   `extra: true` marks a pin that isn't on our agenda at all — the big rides
   worth knowing about during a "free time for rides" block. They render muted
   and can be switched off.
   ========================================================================== */

const PARK_MAPS = [
  /* ------------------------------------------------- Animal Kingdom, day 2 -- */
  {
    key: 'ak',
    live: '1c84a229-8862-4648-9c71-378ddd2c7693',
    theme: 'animal',
    name: 'Animal Kingdom',
    full: "Disney's Animal Kingdom",
    days: [2],
    credit: "Disney's Animal Kingdom guidemap · March 2025",
    img: { sm: 'maps/ak-sm.webp', full: 'maps/ak-full.webp', w: 2100, h: 2252 },
    places: [
      { id: 'gate', name: 'Park entrance', land: 'Oasis', kind: 'gate',
        x: 0.504, y: 0.861,
        note: 'Bag check and the tapstiles. Everything funnels through the Oasis into Discovery Island.' },
      { id: 'buses', name: 'Bus stops', land: 'Entrance', kind: 'gate',
        x: 0.397, y: 0.969,
        note: 'Where the Art of Animation bus drops off and picks up. No Skyliner or monorail here.' },
      { live: '24cf863c-b6ba-4826-a056-0b698989cbf7',
        id: 'fop', name: 'Avatar Flight of Passage', land: 'Pandora — The World of Avatar',
        x: 0.129, y: 0.785,
        note: "Back left corner of the park, about a 10 minute walk from the gate. Go straight there." },
      { live: '7a5af3b7-9bc1-4962-92d0-3ea9c9ce35f0',
        id: 'navi', name: "Na'vi River Journey", land: 'Pandora — The World of Avatar',
        x: 0.219, y: 0.844, extra: true,
        note: 'Gentle boat ride, no height limit. Right next to Flight of Passage.' },
      { live: 'cea213d9-bf4f-408a-ac61-768e7709ab7d',
        id: 'yak', name: 'Yak & Yeti', land: 'Asia', kind: 'meal',
        x: 0.501, y: 0.341,
        note: 'Across the bridge from Discovery Island, on the way into Asia.' },
      { id: 'tree', name: 'Tree of Life', land: 'Discovery Island', kind: 'show',
        x: 0.358, y: 0.420, extra: true,
        note: 'The centre of the park. Walk the Discovery Island Trails around the roots to find the carvings.' },
      { live: '32e01181-9a5f-4936-8a77-0dace1de836c',
        id: 'safaris', name: 'Kilimanjaro Safaris', land: 'Africa',
        x: 0.149, y: 0.248, extra: true,
        note: 'Open-sided truck through the savanna. Best early, while the animals are still moving.' },
      { live: '3a4e0f49-f9ff-4481-a95b-d4952cdf6097',
        id: 'lionking', name: 'Festival of the Lion King', land: 'Africa', kind: 'show',
        x: 0.080, y: 0.411, extra: true,
        note: 'Air-conditioned 30 minute show in a big covered theatre. Good for the twins.' },
      { live: '64a6915f-a835-4226-ba5c-8389fc4cade3',
        id: 'everest', name: 'Expedition Everest', land: 'Asia',
        x: 0.804, y: 0.362, extra: true,
        note: 'Roller coaster with a backwards section. 44"/112 cm.' },
      { id: 'dinosaur', name: 'DINOSAUR', land: 'DinoLand U.S.A.',
        x: 0.647, y: 0.817, extra: true,
        note: 'Dark, loud and jerky. 40"/102 cm.' },

      /* Facilities. Verified against the icons printed on the guidemap, not
         guessed: the cyan baby, the black cross and the circled stroller (the baby
         and the cross share one building in every park, so they share a pin). */
      { id: 'babycare', name: 'Baby Care & First Aid', land: 'Discovery Island', kind: 'care',
        facility: true, x: 0.194, y: 0.443,
        note: 'By Creature Comforts, right where the bridge crosses into Africa. Changing tables, a nursing room with rocking chairs, a microwave and a sink, with nappies, wipes and formula for sale. First Aid is next door.' },
      { id: 'rentals', name: 'Stroller & wheelchair rental', land: 'Oasis', kind: 'gear',
        facility: true, x: 0.473, y: 0.790,
        note: 'Just inside the entrance on the left. Singles, doubles, wheelchairs and ECVs.' },
    ],
  },

  /* --------------------------------------------- Magic Kingdom, days 3 & 7 -- */
  {
    key: 'mk',
    live: '75ea578a-adc8-4116-a54d-dccb60765ef9',
    theme: 'magic',
    name: 'Magic Kingdom',
    full: 'Magic Kingdom',
    days: [3, 7],
    credit: 'Magic Kingdom guidemap · September 2023',
    img: { sm: 'maps/mk-sm.webp', full: 'maps/mk-full.webp', w: 1375, h: 1350 },
    places: [
      { id: 'gate', name: 'Park entrance', land: 'Main Street, U.S.A.', kind: 'gate',
        x: 0.545, y: 0.885,
        note: 'Bag check, then the tapstiles under the railroad station. Buses and the ferry all arrive below this.' },
      { id: 'mainst', name: 'Main Street, U.S.A.', land: 'Parade & fireworks', kind: 'show',
        short: 'Main Street',
        x: 0.545, y: 0.660,
        note: 'The parade comes down from Frontierland, around the hub and out along Main Street. Also the easiest place to stand for the fireworks.' },
      { id: 'castle', name: 'Cinderella Castle', land: 'Fantasyland', kind: 'show',
        x: 0.548, y: 0.322,
        note: 'Happily Ever After projects onto the castle. The hub lawns in front of it are the classic view.' },
      { live: 'f5aad2d4-a419-4384-bd9a-42f86385c750',
        id: 'smallworld', name: "it's a small world", land: 'Fantasyland',
        x: 0.429, y: 0.224,
        note: 'Indoor boat ride, no height limit, fully air-conditioned.' },
      { live: '86a41273-5f15-4b54-93b6-829f140e5161',
        id: 'peterpan', name: "Peter Pan's Flight", land: 'Fantasyland',
        x: 0.450, y: 0.264,
        note: 'Right next door to small world. Suspended ride, gentle.' },
      { live: '0d94ad60-72f0-4551-83a6-ebaecdd89737',
        id: 'pooh', name: 'The Many Adventures of Winnie the Pooh', land: 'Fantasyland',
        x: 0.668, y: 0.272,
        note: 'East side of Fantasyland, past the carrousel.' },
      { live: '9d4d5229-7142-44b6-b4fb-528920969a2c',
        id: 'sevendwarfs', name: 'Seven Dwarfs Mine Train', land: 'Fantasyland',
        x: 0.627, y: 0.237, extra: true,
        note: 'Family coaster that swings side to side. 38"/97 cm.' },
      { live: '273ddb8d-e7b5-4e34-8657-1113f49262a5',
        id: 'carrousel', name: 'Prince Charming Regal Carrousel', land: 'Fantasyland',
        x: 0.524, y: 0.264, extra: true,
        note: 'Right behind the castle. Everyone can ride.' },
      { live: '2551a77d-023f-4ab1-9a19-8afec0190f39',
        id: 'hauntedmansion', name: 'Haunted Mansion', land: 'Liberty Square',
        x: 0.324, y: 0.272,
        note: 'Slow indoor ride in the dark. No height limit, but it is properly spooky.' },
      { live: '6ea670b8-3097-4d60-b69c-94e16071da17',
        id: 'skipper', name: 'Jungle Navigation Co. Skipper Canteen', land: 'Adventureland', kind: 'meal',
        x: 0.363, y: 0.515,
        note: 'Tucked behind the Jungle Cruise. Indoors and quiet, which matters at 4:25 PM with sixteen of us.' },
      { live: '352feb94-e52e-45eb-9c92-e4b44c6b1a9d',
        id: 'pirates', name: 'Pirates of the Caribbean', land: 'Adventureland',
        x: 0.143, y: 0.578,
        note: 'Indoor boat ride with one small drop. No height limit.' },
      { live: '73cb9445-0695-47a3-87ce-d08ae36b5f3c',
        id: 'tiana', name: "Tiana's Bayou Adventure", land: 'Frontierland',
        x: 0.072, y: 0.410,
        note: 'The old Splash Mountain, back left of the park. 40"/102 cm — and you will get wet.' },
      { live: '5a43d1a7-ad53-4d25-abfe-25625f0da304',
        id: 'tron', name: 'TRON Lightcycle / Run', land: 'Tomorrowland',
        x: 0.925, y: 0.285,
        note: 'Far right of the park, behind Space Mountain. 48"/122 cm.' },
      { live: 'b2260923-9315-40fd-9c6b-44dd811dbe64',
        id: 'spacemountain', name: 'Space Mountain', land: 'Tomorrowland',
        x: 0.927, y: 0.463,
        note: 'Indoor coaster in the dark. 44"/112 cm.' },
      { live: '72c7343a-f7fb-4f66-95df-c91016de7338',
        id: 'buzz', name: "Buzz Lightyear's Space Ranger Spin", land: 'Tomorrowland',
        x: 0.782, y: 0.547,
        note: 'Shooting gallery ride. No height limit, everyone can ride.' },

      /* Facilities — read off the guidemap's own icons. */
      { id: 'babycare', name: 'Baby Care & First Aid', land: 'Main Street, U.S.A.', kind: 'care',
        facility: true, x: 0.472, y: 0.591,
        note: 'Beside The Crystal Palace at the top of Main Street, on the Adventureland side of the hub. Changing tables, a nursing room, a microwave and a sink, with nappies, wipes and formula for sale. First Aid shares the building — nurses, plasters, pain relief and somewhere cool to sit down.' },
      { id: 'rentals', name: 'Stroller & wheelchair rental', land: 'Main Street, U.S.A.', kind: 'gear',
        facility: true, x: 0.459, y: 0.770,
        note: 'Just inside the tapstiles by City Hall. Singles, doubles, wheelchairs and ECVs.' },
    ],
  },

  /* ---------------------------------------------- Hollywood Studios, day 4 -- */
  {
    key: 'hs',
    live: '288747d1-8b4f-4a64-867e-ea7c9b27bad8',
    theme: 'studios',
    name: 'Hollywood Studios',
    full: "Disney's Hollywood Studios",
    days: [4],
    credit: "Disney's Hollywood Studios guidemap · March 2023",
    img: { sm: 'maps/hs-sm.webp', full: 'maps/hs-full.webp', w: 1162, h: 1350 },
    places: [
      { id: 'gate', name: 'Park entrance', land: 'Hollywood Boulevard', kind: 'gate',
        x: 0.445, y: 0.845,
        note: 'Bag check, then straight up Hollywood Boulevard. Toy Story Land is up and to the right.' },
      { id: 'skyliner', name: 'Skyliner & buses', land: 'Entrance', kind: 'gate',
        x: 0.385, y: 0.935,
        note: 'Skyliner station is left of the entrance plaza. Change at Caribbean Beach for Art of Animation.' },
      { id: 'tsland', name: 'Toy Story Land', land: 'Toy Story Land', kind: 'show',
        x: 0.570, y: 0.225,
        note: 'About a 10 minute walk from the gate, up past Echo Lake and Animation Courtyard.' },
      { live: '399aa0a1-98e2-4d2b-b297-2b451e9665e1',
        id: 'slinky', name: 'Slinky Dog Dash', land: 'Toy Story Land',
        x: 0.646, y: 0.200,
        note: 'Family coaster, no big drops. 38"/97 cm.' },
      { live: '20b5daa8-e1ea-436f-830c-2d7d18d929b5',
        id: 'tsmania', name: 'Toy Story Mania!', land: 'Toy Story Land',
        x: 0.533, y: 0.317,
        note: '4D shooting game. No height limit — all sixteen of us can ride.' },
      { live: '7a73a6df-4d33-4648-b3e3-57985f84f0ae',
        id: 'rodeo', name: 'Roundup Rodeo BBQ', land: 'Toy Story Land', kind: 'meal',
        x: 0.637, y: 0.344,
        note: 'Inside Toy Story Land, a two minute walk from Slinky and Mania.' },
      { live: 'd56506e2-6ad3-443a-8065-fea37987248d',
        id: 'swirl', name: 'Alien Swirling Saucers', land: 'Toy Story Land',
        x: 0.478, y: 0.167, extra: true,
        note: 'Gentle spinner. 32"/81 cm.' },
      { live: '1a2e70d9-50d5-4140-b69e-799e950f7d18',
        id: 'rotr', name: 'Star Wars: Rise of the Resistance', land: "Star Wars: Galaxy's Edge",
        x: 0.214, y: 0.315,
        note: 'Top left of the park, deep inside Galaxy\u2019s Edge. Allow 15 minutes to walk there. 40"/102 cm.' },
      { live: '34c4916b-989b-4ff1-a7e3-a6a846a3484f',
        id: 'smugglers', name: 'Millennium Falcon: Smugglers Run', land: "Star Wars: Galaxy's Edge",
        x: 0.226, y: 0.111, extra: true,
        note: 'Fly the Falcon. 38"/97 cm.' },
      { live: 'd91a0e9a-8652-4036-822f-e7b12b381273',
        id: 'frozensing', name: 'Frozen Sing-Along', land: 'Echo Lake', kind: 'show',
        x: 0.329, y: 0.591,
        note: 'Hyperion Theater, indoors and air-conditioned. 30 minute show.' },
      { live: '6e118e37-5002-408d-9d88-0b5d9cdb5d14',
        id: 'runaway', name: "Mickey & Minnie's Runaway Railway", land: 'Hollywood Boulevard',
        x: 0.459, y: 0.526, extra: true,
        note: 'Inside the Chinese Theatre at the top of Hollywood Boulevard. No height limit.' },
      { live: '6f6998e8-a629-412c-b964-2cb06af8e26b',
        id: 'tot', name: 'Tower of Terror', land: 'Sunset Boulevard',
        x: 0.704, y: 0.855,
        note: 'The tall brick hotel at the far end of Sunset Boulevard. 40"/102 cm.' },
      { live: '42328c39-76ab-4f03-b862-4206c8d9f7bb',
        id: 'fantasmic', name: 'Fantasmic!', land: 'Sunset Boulevard', kind: 'show',
        x: 0.648, y: 0.816,
        note: 'Hollywood Hills Amphitheater, behind Tower of Terror. Huge open-air theatre — get in 30 minutes early so all sixteen of us sit together.' },

      /* Facilities — read off the guidemap's own icons. */
      { id: 'babycare', name: 'Baby Care & First Aid', land: 'Hollywood Boulevard', kind: 'care',
        facility: true, x: 0.383, y: 0.795,
        note: 'Immediately inside the entrance on the left, by Guest Relations. Changing tables, a nursing room, a microwave and a sink, with nappies, wipes and formula for sale. First Aid is next door.' },
      { id: 'rentals', name: 'Stroller & wheelchair rental', land: 'Hollywood Boulevard', kind: 'gear',
        facility: true, x: 0.517, y: 0.777,
        note: 'Inside the entrance on the right. Singles, doubles, wheelchairs and ECVs.' },
    ],
  },

  /* -------------------------------------------------------- EPCOT, day 6 -- */
  {
    key: 'ep',
    live: '47f90d2c-e191-4239-a466-5892ef59a88b',
    theme: 'epcot',
    name: 'EPCOT',
    full: 'EPCOT',
    days: [6],
    credit: 'EPCOT guidemap · July 2026',
    img: { sm: 'maps/ep-sm.webp', full: 'maps/ep-full.webp', w: 2100, h: 2445 },
    places: [
      { id: 'gateway', name: 'International Gateway', land: 'World Showcase', kind: 'gate',
        x: 0.795, y: 0.290,
        note: 'The back entrance, and where the Skyliner drops us. France is a two minute walk from the tapstiles — which is the whole reason we rope drop Remy from here.' },
      { id: 'gate', name: 'Main entrance', land: 'World Celebration', kind: 'gate',
        x: 0.442, y: 0.943,
        note: 'The front gate under Spaceship Earth. Buses and the monorail arrive here, not at the Gateway.' },
      { live: '1e735ffb-4868-47f1-b2cd-2ac1156cd5f0',
        id: 'remy', name: "Remy's Ratatouille Adventure", land: 'France',
        x: 0.781, y: 0.119,
        note: 'No Lightning Lane needed and no height limit — everyone can ride. Straight up from the International Gateway.' },
      { live: '81b15dfd-cf6a-466f-be59-3dd65d2a2807',
        id: 'soarin', name: "Soarin' Around the World", land: 'The Land',
        x: 0.730, y: 0.709,
        note: 'Hang-gliding simulator inside The Land pavilion. 40"/102 cm.' },
      { live: 'd4179c4c-eb08-4559-aa7c-f9802fda641b',
        id: 'gardengrill', name: 'Garden Grill', land: 'The Land', kind: 'meal',
        x: 0.757, y: 0.717,
        note: "Chip 'n' Dale character meal, upstairs in the same pavilion as Soarin'. Walk out of the ride and you are there." },
      { live: '480fde8f-fe58-4bfb-b3ab-052a39d4db7c',
        id: 'ssearth', name: 'Spaceship Earth', land: 'World Celebration',
        x: 0.438, y: 0.875,
        note: 'The giant silver golf ball. Slow indoor ride, no height limit.' },
      { live: 'e3549451-b284-453d-9c31-e3b1207abd79',
        id: 'guardians', name: 'Guardians of the Galaxy: Cosmic Rewind', land: 'World Discovery',
        x: 0.288, y: 0.821,
        note: 'Indoor coaster that launches backwards. 42"/107 cm.' },
      { live: '37ae57c5-feaf-4e47-8f27-4b385be200f0',
        id: 'testtrack', name: 'Test Track', land: 'World Discovery',
        x: 0.253, y: 0.655,
        note: 'Design a car, then take it round the outdoor loop. 40"/102 cm.' },
      { live: '8d7ccdb1-a22b-4e26-8dc8-65b1938ed5f0',
        id: 'frozen', name: 'Frozen Ever After', land: 'Norway',
        x: 0.112, y: 0.423,
        note: 'Boat ride through Arendelle. No height limit. Far side of the lagoon — allow 15 minutes to walk round.' },
      { live: 'dae68dee-dfba-4128-b594-6aa12add1070',
        id: 'moana', name: 'Journey of Water, Inspired by Moana', land: 'World Nature',
        x: 0.545, y: 0.793, extra: true,
        note: 'Walk-through water trail. Free to wander, and the twins can get wet.' },
      { live: 'fb076275-0570-4d62-b2a9-4d6515130fa3',
        id: 'nemo', name: 'The Seas with Nemo & Friends', land: 'World Nature',
        x: 0.567, y: 0.836, extra: true,
        note: 'Aquarium and a gentle indoor ride. Good for a cool-down.' },

      /* Facilities — read off the guidemap's own icons. */
      { id: 'babycare', name: 'Baby Care & First Aid', land: 'World Discovery', kind: 'care',
        facility: true, x: 0.260, y: 0.533,
        note: 'By the Odyssey, between Test Track and the bridge into World Showcase. Changing tables, a nursing room, a microwave and a sink, with nappies, wipes and formula for sale. First Aid is alongside.' },
      { id: 'rentals', name: 'Stroller & wheelchair rental', land: 'World Celebration', kind: 'gear',
        facility: true, x: 0.377, y: 0.910,
        note: 'Left of the main entrance plaza as you come through. Singles, doubles, wheelchairs and ECVs.' },
    ],
  },
];
