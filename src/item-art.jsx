const shapes = {
  flour: [
    ['#412a38','M3 4h2V2h7v2h2v3h-2v1h2v3h1v3h-2v1H3v-1H1v-3h1V8h2V7H2V4z'],
    ['#a66d50','M4 6h8v2h1v3h1v3H2v-3h1V8h1z'],
    ['#c99061','M4 8h6v1h2v4H3v-3h1z'],
    ['#e6b979','M3 4h2V3h7v1h1v2h-2v1H5V6H3z'],
    ['#fff4d9','M5 4h7v1h-1v1H5zm1 6h4v1h1v2H5v-2h1z'],
    ['#e7d2b2','M7 9h2v1H7zm-2 3h5v1H5z'],
  ],
  coal: [
    ['#1c1b2b','M6 2h4l4 4v3l2 2v3h-2v1H2v-1H0v-3l3-3V5z'],
    ['#42465c','M6 3h4l3 3v3l2 2v2h-3l-1-3H8L4 8V6zM3 10h3l3 3v1H2l-1-2z'],
    ['#737c8f','M6 3h4l1 2-3 2H5V6zm-3 7h2l1 1H2zm8 1h2l1 2h-2z'],
    ['#b8babb','M6 4h3v1H6zm3 4h2v1H9z'],
  ],
  fuel: [
    ['#3d2031','M4 1h8v1h2v12h-2v1H4v-1H2V2h2z'],
    ['#ab3c32','M3 3h10v10H3z'],
    ['#ec7351','M4 3h2v10H4zM5 2h7v1H5z'],
    ['#74263a','M11 3h2v10h-2z'],
    ['#ada497','M2 4h12v2H2zm0 6h12v2H2z'],
    ['#fbe7a2','M8 6h1v1h1v2H7V8h1z'],
  ],
  biofuel: [
    ['#192d31','M5 1h7v2h2v2h1v9h-1v1H2v-1H1V6h1V4h3zm2 1v2h4V2z'],
    ['#4d8056','M5 4h6v1h2v2h1v7H2V6h1V5h2z'],
    ['#87af5f','M3 6h2v6H3zm3-4h1v2H6zm6 1h2v2h-2z'],
    ['#28574d','M12 7h2v7H4v-1h8z'],
    ['#cce688','M11 6v3h-1v2H8v1H6v-2h1V8h2V7h1V6z'],
    ['#fcf3a5','M7 10h1V9h1V8h1v1H9v1H8v1H7z'],
  ],
  slices: [
    ['#792d38','M7 2h6v1h2v2h1v3h-1v2h-2v1H7V9h1V7H7V6H6V3zm-4 7h4v1h3v1h3v2h-2v1H4v-1H1v-1H0v-2h3z'],
    ['#ec7657','M8 3h4v1h2v2h1v2h-2v2H8V9h1V6H8zM1 11h3v1h6v1H4v-1H1z'],
    ['#fff0bd','M8 3h4v1h2v2h1v1h-2v2H9V7h1V5H8zM2 10h4v1h3v1H4v-1H2z'],
    ['#cba673','M11 6h1v1h-1zM5 11h1v1H5z'],
  ],
  puree: [
    ['#362235','M13 1h2v2h-1v2h-1v1h2v4h-1v3h-2v1H4v-1H2v-3H1V6h2V5h8V3h1V2h1z'],
    ['#eee3d7','M13 2h1v1h-1v2h-1v2h-2V6h1V4h1V3h1z'],
    ['#9a86b9','M2 8h12v2h-1v2h-2v1H5v-1H3v-2H2z'],
    ['#d5bfda','M2 8h12v1H2zm2 2h2v2H4z'],
    ['#b84d83','M3 6h6V5h2v1h2v1h1v1H2V7h1z'],
    ['#e381a3','M4 6h2v1H4zm3 1h3v1H7zm4 0h1v1h-1z'],
  ],
  pie: [
    ['#522c32','M6 2h6v1h2v1h1v2h1v5h-1v2h-2v1H3v-1H1v-2H0V8h1V5h2V3h3z'],
    ['#ab573b','M1 8h14v3h-1v1h-2v1H4v-1H2v-1H1z'],
    ['#df8d4d','M2 6h1V4h3V3h6v1h2v2h1v3h-2v1H3V9H1V7h1z'],
    ['#824338','M4 5h2v2H4zm4-1h2v2H8zm4 1h1v2h-1zM6 7h2v2H6zm4 0h2v2h-2z'],
    ['#ffc880','M5 4h1v1H5zm1 1h1v1H6zm1 1h1v1H7zm1 1h1v1H8zm1 1h2v1H9zm0-4h1v1H9zm1 1h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zM2 9h2v1H2zm2 1h8v1H4zm8-1h2v1h-2z'],
  ],
  boot: [
    ['#263246','M6 1h7v2h1v7h-1v4H2v-1H0v-3h1V8h2V7h3z'],
    ['#8c523d','M7 2h5v2h1v6h-1v2H2v-1H1v-1h1V9h2V8h3z'],
    ['#edaa65','M7 2h5v2H7zm0 4h5v1H7zM4 9h4v1H4zm-2 2h10v1H2z'],
    ['#79e4da','M1 3h4v1H1zm0 2h3v1H1zM1 14h12v1H1z'],
  ],
  arrowUp: [
    ['#294436','M7 1h2v1h1v1h1v1h1v1h1v1h1v3h-4v6H6V9H2V6h1V5h1V4h1V3h1V2h1z'],
    ['#78c76c','M7 2h2v1h1v1h1v1h1v1h1v2H9v6H7V8H3V6h1V5h1V4h1V3h1z'],
    ['#f3f7b0','M7 2h2v1h1v1h1v1h1v1h-2V5H9V4H7v1H6v1H4V5h1V4h1V3h1zM7 7h1v7H7z'],
  ],
  hedgePair: [
    ['#3f2830','M2 7h1V5h1V4h4v1h1V4h1V3h4v1h1v1h1v5h-1v1h-2v2H2v-1H0V9h1V7z'],
    ['#98644e','M10 4h4v1h1v3h-1v2h-4V9H8V7h1V5h1zM3 6h2V5h3v1h2v3H9v2H7v1H3v-1H2V8h1z'],
    ['#f7c18b','M13 7h1v1h2v1h-1v1h-3V8h1zM8 9h1v1h2v1H9v1H6v-2h2z'],
    ['#34242c','M13 8h1v1h-1zM8 10h1v1H8z'],
    ['#c48961','M10 5h3v1h-3zm-6 2h3v1H4z'],
  ],
  flask: [
    ['#183447','M5 1h6v2h-1v4h1v1h1v2h1v3h-1v2H4v-2H3v-3h1V8h1V7h1V3H5z'],
    ['#b7f0e2','M6 2h4v1H9v5h1v1h1v2h1v2h-1v1H5v-1H4v-2h1V9h1V8h1V3H6z'],
    ['#65cbc5','M6 9h4v1h1v3H5v-3h1z'],
    ['#28798f','M6 12h4v1H6zm3-2h1v1H9z'],
    ['#f4ffd9','M6 10h1v2H6z'],
  ],
};

export function ItemGlyph({ name, className }) {
  return <svg className={className} viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
    {shapes[name].map(([fill, d]) => <path key={d} d={d} fill={fill}/>)}
  </svg>;
}

export const hasItemGlyph = name => Object.hasOwn(shapes, name);
