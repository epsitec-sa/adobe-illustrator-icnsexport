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

  const apps = [
    "cc",
    "cf",
    "cs",
    "pe",
    "cc_safe",
    "cf_safe",
    "cs_safe",
    "pe_safe",
    "cc_doc",
    "cf_doc",
    "cs_doc",
    "pe_doc"
  ];

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

  var itemsFormat = {};
  function genItemsName() {
    return apps.reduce(function(names, appName) {
      formats.reduce(function(names, f) {
        var name = `${f.size}x${f.size}`;
        names.push(name);
        itemsFormat[name] = {};
        itemsFormat[name].app = appName;
        itemsFormat[name].type = f.type;
        itemsFormat[name].size = f.size;
        return names;
      }, names);
      return names;
    }, []);
  }

  var items = genItemsName();
  var icnsApps = apps.reduce(function(icns, app) {
    icns[app] = {};
    icns[app].handle = getTargetFile(doc, `${app}.icns`);
    icns[app].totalLength = 0;
    icns[app].exported = [];
    return icns;
  }, {});

  doc.artboards
    .filter(ab => items.indexOf(ab.name))
    .forEach(ab => {
      const format = itemsFormat[ab.name];
      const path = `${Folder.temp}/${ab.name}.png`;
      const filePng = new File(path);
      exportAsPng(filePng, i);
      format.png = readFile(filePng);
      icnsApps[format.app].exported.push(format);
      icnsApps[format.app].totalLength += format.png.length;
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

  function getTargetFile(doc, ext) {
    var destFolder = Folder.selectDialog(
      "Select folder for " + ext + " file.",
      "~"
    );

    if (destFolder) {
      var newName = "";

      // if name has no dot (and hence no extension),
      // just append the extension
      if (doc.name.indexOf(".") < 0) {
        newName = doc.name + ext;
      } else {
        var dot = doc.name.lastIndexOf(".");
        newName += doc.name.substring(0, dot);
        newName += ext;
      }

      // Create the file object to save to
      return new File(destFolder + "/" + newName);
    } else {
      return null;
    }
  }
})();
