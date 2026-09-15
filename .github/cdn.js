// Regenerates the dist/cdn release copies that ship in the published npm
// tarball. Upstream creates these at release time through makeReleaseCopies()
// in build/release.js, which only runs under the external jquery-release tool;
// this script performs the identical transformations so a source build can
// reproduce the published package.
//
// Usage: node .github/cdn.js

"use strict";

var fs = require( "fs" ),

	version = JSON.parse( fs.readFileSync( "package.json", "utf8" ) ).version,

	devFile = "dist/jquery.js",
	minFile = "dist/jquery.min.js",
	mapFile = "dist/jquery.min.map",

	cdnFolder = "dist/cdn",

	releaseFiles = {
		"jquery-VER.js": devFile,
		"jquery-VER.min.js": minFile,
		"jquery-VER.min.map": mapFile,
		"jquery.js": devFile,
		"jquery.min.js": minFile,
		"jquery.min.map": mapFile,
		"jquery-latest.js": devFile,
		"jquery-latest.min.js": minFile,
		"jquery-latest.min.map": mapFile
	};

if ( !fs.existsSync( cdnFolder ) ) {
	fs.mkdirSync( cdnFolder );
}

Object.keys( releaseFiles ).forEach(function( key ) {
	var text,
		builtFile = releaseFiles[ key ],
		unpathedFile = key.replace( /VER/g, version ),
		releaseFile = cdnFolder + "/" + unpathedFile;

	if ( /\.map$/.test( releaseFile ) ) {

		// Map files need to reference the new uncompressed name;
		// assume that all files reside in the same directory.
		text = fs.readFileSync( builtFile, "utf8" )
			.replace( /"file":"([^"]+)","sources":\["([^"]+)"\]/,
				"\"file\":\"" + unpathedFile.replace( /\.min\.map/, ".min.js" ) +
				"\",\"sources\":[\"" + unpathedFile.replace( /\.min\.map/, ".js" ) + "\"]" );
		fs.writeFileSync( releaseFile, text );

	} else if ( /\.min\.js$/.test( releaseFile ) ) {

		// Remove the source map comment; it causes way too many problems.
		text = fs.readFileSync( builtFile, "utf8" )
			.replace( /\/\/# sourceMappingURL=\S+/, "" );
		fs.writeFileSync( releaseFile, text );

	} else {
		fs.writeFileSync( releaseFile, fs.readFileSync( builtFile ) );
	}

	console.log( "File '" + releaseFile + "' created." );
});
