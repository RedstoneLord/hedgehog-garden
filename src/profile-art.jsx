import { pixelPaths } from './art.jsx';

const marks = {
  speed: { colors:['#4a2741','#a75945','#f29653','#ffce78'], streak:'M0 4h6v1H0zM0 7h3v1H0zM1 10h4v1H1zM0 12h4v1H0z', shape:[
    '......oooo......','.....ohhhso.....','.....ohhsso.....','....ohhssso.....',
    '....ohhsooo.....','....ohmsso......','....ohmmso......','....ohmmsoo.....',
    '....ohmmhhso....','....ohhmmhssso..','...ohhmmmmsssso.','..ohhmmmmmmssso.',
    '..oooooooossso..','...ooooooo......',
  ] },
  strength: { colors:['#451f35','#9c3547','#e65f62','#ffd197'], streak:'M0 5h2v1H0zM1 2h1v2H1zM13 10h3v1h-3zM14 9h1v3h-1z', shape:[
    '................','......o.........','.....oho........','....omsho.......',
    '..oomssoho......','.ohossoomho.....','.omhoomomsho....','..omhomomsso....',
    '...omhsomssooo..','....omhssooosso.','.....omhosoosmo.','......omhoosmo..',
    '.......ooommo...','........oooo....',
  ] },
  endurance: { colors:['#233d38','#427451','#70ae63','#c5e58c'], streak:'M2 2h2v1H2zM3 1h1v3H3zM13 11h3v1h-3zM14 10h1v3h-1z', shape:[
    '................','................','..ooo.....ooo...','.ohhho...ohhho..',
    '.ohmmho.ohmmmo..','.ohmmmhommmsso..','.ohmmmmmmmsso...','..ohmmhmmssso...',
    '...ohmhmmssso...','...omhmmssso....','....ommsso......','.....omso.......',
    '......oo........','................',
  ] },
  dexterity: { colors:['#522f29','#a15b43','#e29c58','#ffd39b'], streak:'M10 1h1v4h-1zM9 2h3v1H9zM13 5h3v1h-3zM14 4h1v3h-1z', shape:[
    '................','....oo..........','...ohho.........','...ohsoo........',
    '...ohsooo.......','...ohsomoo......','...ohsoomoo.....','...ohsooomo.....',
    '..oohsooooo.....','.ohhohmmsso.....','..ohhmssso......','...ohmsso.......',
    '....oooo........','................',
  ] },
  handling: { colors:['#293444','#546581','#83adc2','#d1e3de'], streak:'M12 3h3v1h-3zM13 2h1v3h-1zM1 12h3v1H1z', shape:[
    '................','................','.......oo.......','.....oohmoo.....',
    '...oohhmmsooo...','..ohhhmmssmmso..','..ooomhhmmooso..','..ohssoooomoso..',
    '..ohsssmhsmoso..','..ohsomshsmoso..','..ohsohsmssoso..','..oomohmmssooo..',
    '...oommsoo......','.....ooo........',
  ] },
  foraging: { colors:['#302547','#674c8d','#ab84ce','#f0d7f4'], streak:'M0 1h4v1H0zM1 0h1v4H1zM13 3h2v1h-2zM12 10h3v1h-3z', shape:[
    '.....oooo.......','...oohhmmoo.....','..ohhmmssmso....','..ohms..smso....',
    '.ohms.hh.smso...','.ohms.hh.smso...','.omhs....smso...','..omhs..smsso...',
    '...omhmmssoo....','....oooso.......','......oosoo.....','.......ohsoo....',
    '........ohsso...','.........oosso..','..........ooo...',
  ] },
  pockets: { colors:['#4f253d','#a65061','#dc7b60','#ffd493'], streak:'M2 2h3v1H2zM3 1h1v3H3zM12 4h3v1h-3zM13 3h1v3h-1z', shape:[
    '................','................','.....o...o......','....ohomoh......',
    '...ohmmooho.....','...ohmsohmo.....','..ooohhhhhhoo...','..ohmmmmmmmso...',
    '..ohmmmmmmmso...','..ohmmhmmmmso...','...ohhmmmmso....','...ohmmmso......',
    '....ooooo.......','................',
  ] },
  glean: { colors:['#332349','#63548d','#86b8b4','#e6f2bd'], streak:'M7 0h2v1H7zM1 2h2v1H1zM13 11h2v1h-2zM14 10h1v3h-1z', shape:[
    '................','................','......oooo......','....oohhhmoo....',
    '..oohhmmhhmsoo..','.ohhmmosooshhso.','ohhhhohhooohhmso','.ohhhohoooohhso.',
    '..oohhhooohsoo..','....oommsooo....','......oooo......','................',
  ] },
  bloom: { colors:['#472f3c','#ad6561','#eaae6d','#ffe69a'], streak:'M0 9h3v1H0zM1 8h1v3H1zM12 2h4v1h-4zM13 1h1v3h-1z', shape:[
    '.......o........','......oho.......','...oo.omo.oo....','..ohmoomoomho...',
    '...omshhhsmo....','....ohhmmho.....','..oohhmmhhoo....','.ohmhhmhhmsso...',
    '..oosshhssoo....','....oohoo.......','....omomoo......','...ommoommo.....',
    '....oossooo.....','......ooo.......',
  ] },
};

const profiles = Object.fromEntries(Object.entries(marks).map(([id, art]) => [id, {
  paths: pixelPaths(art.shape), colors: Object.fromEntries(['o','s','m','h'].map((key,i) => [key,art.colors[i]])), streak:art.streak,
}]));

export function ProfileGlyph({ name }) {
  const art = profiles[name];
  return <svg viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
    <path d={art.streak} fill={art.colors.m} opacity=".75"/>
    {Object.entries(art.paths).map(([color,path]) => <path key={color} d={path} fill={art.colors[color]}/>)}
  </svg>;
}
