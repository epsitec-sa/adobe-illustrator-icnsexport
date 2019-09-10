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

/* -------------------------------------------------------------------------- */

function FileSystem(doc) {
  this._doc = doc;
  this._targetDir = null;
}

FileSystem.prototype.selectDir = function(message) {
  this._targetDir = Folder.selectDialog(message, "~");
  return !!this._targetDir;
};

FileSystem.prototype.createFile = function(app, ext) {
  return new File(`${this._targetDir}/${app}.${ext}`);
};

FileSystem.prototype.getTargetDir = function() {
  return this._targetDir;
};

FileSystem.write8 = function(file, value) {
  const a = String.fromCharCode((value >> 0) & 255);
  return file.write(a);
};

FileSystem.write16Big = function(file, value) {
  const a = String.fromCharCode((value >> 8) & 255);
  const b = String.fromCharCode((value >> 0) & 255);
  return file.write(a + b);
};

FileSystem.write32Big = function(file, value) {
  const a = String.fromCharCode((value >> 24) & 255);
  const b = String.fromCharCode((value >> 16) & 255);
  const c = String.fromCharCode((value >> 8) & 255);
  const d = String.fromCharCode((value >> 0) & 255);
  return file.write(a + b + c + d);
};

FileSystem.write16Little = function(file, value) {
  const a = String.fromCharCode((value >> 8) & 255);
  const b = String.fromCharCode((value >> 0) & 255);
  return file.write(b + a);
};

FileSystem.write32Little = function(file, value) {
  const a = String.fromCharCode((value >> 24) & 255);
  const b = String.fromCharCode((value >> 16) & 255);
  const c = String.fromCharCode((value >> 8) & 255);
  const d = String.fromCharCode((value >> 0) & 255);
  return file.write(d + c + b + a);
};

FileSystem.writeString = function(file, str) {
  file.write(str);
};

/* -------------------------------------------------------------------------- */

function Image(type, size) {
  this._type = type;
  this._size = size;
  this._location = null;
}

Image.prototype.getType = function() {
  return this._type;
};

Image.prototype.getSize = function() {
  return this._size;
};

Image.prototype.setLocation = function(location) {
  this._location = location;
};

/* -------------------------------------------------------------------------- */

function Format(doc, formats) {
  this._doc = doc;
  this._format = formats;
  this._formatBySize = {};
  this._format.forEach(
    format => (this._formatBySize[format.getSize()] = format)
  );
}

Format.prototype.getFormat = function(size) {
  return this._formatBySize[size];
};

/* -------------------------------------------------------------------------- */

function ICO(doc, fs) {
  this._format = new Format(doc, [
    new Image("", 256),
    new Image("", 128),
    new Image("", 96),
    new Image("", 64),
    new Image("", 48),
    new Image("", 32),
    new Image("", 24),
    new Image("", 16)
  ]);
  this._fs = fs;
  this._pngs = {};
}

ICO.prototype.getFormat = function(size) {
  return this._format.getFormat(size);
};

ICO.prototype.setPNG = function(png, size) {
  this._pngs[size] = png;
};

ICO.prototype.write = function(app) {
  const dataList = [];
  const file = this._fs.createFile(app, "ico");

  this._format.forEach(format => {
    const size = format.getSize();
    const png = this._pngs[size];
    if (!png) {
      return;
    }
    const data = Document.readFile(png);
    dataList.push({ size, data });
  });

  let topOffset = 6 + dataList.length * 16;

  dataList.forEach(entry => {
    entry.offset = topOffset;
    topOffset += entry.data.length;
  });

  Document.openFile(file, "w", () => {
    /* ICONDIR */
    FileSystem.write16Little(file, 0);
    FileSystem.write16Little(file, 1); /* .ICO type */
    FileSystem.write16Little(file, dataList.length); /* Number of images */

    /* ICONDIRENTRY */
    dataList.forEach(({ size, data, offset }) => {
      FileSystem.write8(file, size == 256 ? 0 : size); /* width */
      FileSystem.write8(file, size == 256 ? 0 : size); /* height */
      FileSystem.write8(file, 0); /* no color palette */
      FileSystem.write8(file, 0); /* reserved */
      FileSystem.write16Little(file, 0); /* color plane */
      FileSystem.write16Little(file, 0); /* 0 for PNG */
      FileSystem.write32Little(file, data.length); /* data image size */
      FileSystem.write32Little(file, offset); /* data offset */
    });

    /* Referenced image data */
    dataList.forEach(({ data }) => {
      FileSystem.writeString(file, data);
    });
  });
};

/* -------------------------------------------------------------------------- */

function ICNS(doc, fs) {
  this._format = new Format(doc, [
    new Image("icp4", 16),
    new Image("icp5", 32),
    new Image("icp6", 64),
    new Image("ic07", 128),
    new Image("ic08", 256),
    new Image("ic09", 512),
    new Image("ic10", 1024),
    new Image("ic11", 32),
    new Image("ic12", 64),
    new Image("ic13", 256),
    new Image("ic14", 512)
  ]);
  this._fs = fs;
  this._pngs = {};
}

ICNS.prototype.getFormat = function(size) {
  return this._format.getFormat(size);
};

ICNS.prototype.setPNG = function(png, size) {
  this._pngs[size] = png;
};

ICNS.prototype.write = function(app) {
  let totalLength = 0;
  const dataList = [];
  const file = this._fs.createFile(app, "icns");

  this._format.forEach(format => {
    const size = format.getSize();
    const png = this._pngs[size];
    if (!png) {
      return;
    }
    const data = Document.readFile(png);
    const { length } = data;
    dataList.push({ size, data });
    totalLength += length;
  });

  Document.openFile(file, "w", () => {
    FileSystem.writeString(file, "icns");
    FileSystem.write32Big(file, 8 + 8 * dataList.length + totalLength);

    dataList.forEach(({ size, data }) => {
      const format = this.getFormat(size);
      FileSystem.writeString(file, format.getType());
      FileSystem.write32Big(file, data.length + 8);
      FileSystem.writeString(file, data);
    });
  });
};

/* -------------------------------------------------------------------------- */

function Document(doc) {
  this._doc = doc;
}

Document.prototype.exportPNG = function(file, artboardIdx) {
  const expType = ExportType.PNG24;
  const exp = new ExportOptionsPNG24();

  exp.antiAliasing = true;
  exp.artBoardClipping = true;
  exp.transparency = true;
  exp.matte = true;

  this._doc.artboards.setActiveArtboardIndex(artboardIdx);
  this._doc.exportFile(file, expType, exp);
};

Document.prototype.exportSVG = function(file, artboardIdx) {
  const expType = ExportType.SVG;
  const exp = new ExportOptionsSVG();

  exp.saveMultipleArtboards = true;
  exp.artboardRange = (artboardIdx + 1).toString();
  exp.preserveEditability = false;
  exp.embedRasterImages = true;
  exp.embedAllFonts = true;
  exp.fontSubsetting = SVGFontSubsetting.GLYPHSUSED;
  exp.fontType = SVGFontType.SVGFONT;

  this._doc.artboards.setActiveArtboardIndex(artboardIdx);

  /* Export SVG image in a temporaray directory */
  const tmpFolder = Folder(Folder.temp + `/ai-icon-exporter-${artboardIdx}`);
  tmpFolder.create();
  let tmpFile = new File(`${tmpFolder.fsName}/${artboardIdx}.svg`);
  if (tmpFile.exists) {
    tmpFile.remove();
  }

  this._doc.exportFile(file, expType, exp);

  tmpFile = tmpFolder.getFiles("*.svg");
  if (!tmpFile.length) {
    alert("Couldn't export SVG file sorry");
    tmpFolder.remove();
  }

  /* Copy the SVG file to the final destination */
  tmpFile = tmpFile[0];
  tmpFile.copy(file);
  tmpFile.remove();
  tmpFolder.remove();
};

Document.readFile = function(file) {
  let buffer = null;
  Document.openFile(file, "r", () => {
    buffer = file.read();
  });
  return buffer;
};

Document.openFile = function(file, mode, openCallback) {
  file.encoding = "BINARY";
  if (!file.open(mode)) {
    throw new Error(`Could not read ${file}`);
  }
  try {
    openCallback();
  } finally {
    file.close();
  }
};

/* -------------------------------------------------------------------------- */

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

  if (!apps.length) {
    alert("No app defined");
    return;
  }

  const document = new Document(doc);
  const fs = new FileSystem(doc);

  if (!fs.selectDir("Select the destination folder for the icons")) {
    return;
  }

  apps.forEach(app => {
    /* Change layer visibility according to the current app */
    for (const _app in layers) {
      if (Object.prototype.hasOwnProperty.call(layers, _app)) {
        layers[_app].forEach(layer => {
          layer.visible = _app === app;
        });
      }
    }

    const icons = [new ICNS(doc, fs), new ICO(doc, fs)];

    docArtboards
      .filter(ab => /[0-9]+/.test(ab.name))
      .forEach((ab, idx) => {
        const size = ab.name;
        const file = fs.createFile(`${app}_${size}`, "png");
        document.exportPNG(file, idx);
        if (size == 1024) {
          const file = fs.createFile(app, "svg");
          document.exportSVG(file, idx);
        }
        icons.forEach(icon => icon.getFormat(size) && icon.setPNG(file, size));
      });

    icons.forEach(icon => icon.write(app));
  });

  alert(`All icons are exported to ${fs.getTargetDir()}`);
})();
