/*!
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Christian Hoffmeister
 * Copyright (c) 2019 Epsitec SA
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function() {
  var doc = null;
  try {
    doc = app.activeDocument;
  } catch (ex) {
    alert("You must have an active document");
    return;
  }

  if (doc.path == "" || !doc.saved) {
    alert("You must save your document before exporting it");
    return;
  }

  const formats = [
    { type: "icp4", size: 16 },
    { type: "icp5", size: 32 },
    { type: "icp6", size: 64 },
    { type: "ic07", size: 128 },
    { type: "ic08", size: 256 },
    { type: "ic09", size: 512 },
    { type: "ic10", size: 1024 },
    { type: "ic11", size: 32 },
    { type: "ic12", size: 64 },
    { type: "ic13", size: 256 },
    { type: "ic14", size: 512 }
  ];

  const apps = [];
  const layers = {};

  const docLayers = [];
  const docArtboards = [];

  function init() {
    for (let i = 0; i < doc.artboards.length; i++) {
      docArtboards.push(doc.artboards[i]);
    }
    for (let i = 0; i < doc.layers.length; i++) {
      docLayers.push(doc.layers[i]);
    }

    docLayers
      .filter(layer => /<[a-z]+>/.test(layer.name))
      .forEach(layer => {
        const app = layer.name.replace(/.*<([a-z]+)>.*/, "$1");
        if (apps.indexOf(app) < 0) {
          apps.push(app);
        }
        if (!layers[app]) {
          layers[app] = [];
        }
        layers[app].push(layer);
      });
  }

  init();

  var itemsFormat = {};

  function genItemsName() {
    return apps.reduce(function(names, app) {
      formats.reduce(function(names, f) {
        var name = `${app}_${f.size}x${f.size}`;
        names.push(name);
        itemsFormat[name] = {};
        itemsFormat[name].app = app;
        itemsFormat[name].type = f.type;
        itemsFormat[name].size = f.size;
        return names;
      }, names);
      return names;
    }, []);
  }

  var items = genItemsName();

  const dir = getTargetDir(doc);

  var icnsApps = apps.reduce(function(icns, app) {
    icns[app] = {};
    icns[app].handle = getTargetFile(dir, doc, app, "icns");
    icns[app].totalLength = 0;
    icns[app].exported = [];
    return icns;
  }, {});

  apps.forEach(app => {
    /* Change layer visibility according to the current app */
    for (const _app in layers) {
      if (layers.hasOwnProperty(_app)) {
        layers[_app].forEach(layer => {
          layer.visible = _app === app;
        });
      }
    }

    docArtboards
      .filter(ab => /[0-9]+x[0-9]+/.test(ab.name))
      .forEach((ab, i) => {
        const format = itemsFormat[`${app}_${ab.name}`];
        if (!format) {
          return;
        }
        const path = `${Folder.temp}/${app}_${ab.name}.png`;
        const filePng = new File(path);
        exportAsPng(filePng, i);
        format.png = readFile(filePng);
        icnsApps[format.app].exported.push(format);
        icnsApps[format.app].totalLength += format.png.length;
      });
  });

  apps.forEach(app => {
    const icns = icnsApps[app];
    const icnsFile = icns.handle;
    openFile(icnsFile, "w");
    writeString(icnsFile, "icns");
    writeInt(icnsFile, 8 + 8 * formats.length + icns.totalLength);

    icns.exported.forEach(format => {
      writeString(icnsFile, format.type);
      writeInt(icnsFile, format.png.length + 8);
      writeString(icnsFile, format.png);
    });

    closeFile(icnsFile);
  });

  alert("All icons are exported");

  function writeInt(file, i) {
    var a = String.fromCharCode((i >> 24) & 255);
    var b = String.fromCharCode((i >> 16) & 255);
    var c = String.fromCharCode((i >> 8) & 255);
    var d = String.fromCharCode((i >> 0) & 255);
    return file.write(a + b + c + d);
  }

  function writeString(file, str) {
    file.write(str);
  }

  function readFile(file) {
    openFile(file, "r");
    var result = file.read();
    closeFile(file);
    file.remove();
    return result;
  }

  function openFile(file, mode) {
    file.encoding = "BINARY";
    if (!file.open(mode)) throw new Error("Could not read " + file);
  }

  function closeFile(file) {
    file.close();
  }

  function exportAsPng(file, artboardIndex) {
    var expType = ExportType.PNG24;
    var exp = new ExportOptionsPNG24();
    exp.antiAliasing = true;
    exp.artBoardClipping = true;
    exp.transparency = true;
    exp.matte = true;

    doc.artboards.setActiveArtboardIndex(artboardIndex);
    doc.exportFile(file, expType, exp);
  }

  function getTargetDir(doc) {
    return Folder.selectDialog("Select folder for the icons.", "~");
  }

  function getTargetFile(dir, doc, app, ext) {
    const fileName = `${doc.name}-${app}.${ext}`;
    return new File(`${dir}/${fileName}`);
  }
})();
