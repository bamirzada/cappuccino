/*
 * FileExecutable.js
 * Objective-J
 *
 * Created by Francisco Tolmasky.
 * Copyright 2010, 280 North, Inc.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
 */

var FileExecutablesForURLStrings = { };

function FileExecutable(/*CFURL|String*/ aURL, /*Executable*/ anExecutable)
{
    aURL = makeAbsoluteURL(aURL);

    var URLString = aURL.absoluteString(),
        existingFileExecutable = FileExecutablesForURLStrings[URLString];

    if (existingFileExecutable)
        return existingFileExecutable;

    FileExecutablesForURLStrings[URLString] = this;

    var fileContents = StaticResource.resourceAtURL(aURL).contents(),
        executable = NULL,
        extension = aURL.pathExtension();

    if (anExecutable)
        executable = anExecutable;

    else if (fileContents.match(/^@STATIC;/))
        executable = decompile(fileContents, aURL);

    else if (extension === "j" || !extension)
        executable = exports.preprocess(fileContents, aURL, Preprocessor.Flags.IncludeDebugSymbols);

    else
        executable = new Executable(fileContents, [], aURL);

    Executable.apply(this, [executable.code(), executable.fileDependencies(), aURL, executable._function]);

    this._hasExecuted = NO;
}

exports.FileExecutable = FileExecutable;

FileExecutable.prototype = new Executable();

#ifdef COMMONJS
FileExecutable.allFileExecutables = function()
{
    var URLString,
        fileExecutables = [];

    for (URLString in FileExecutablesForURLStrings)
        if (hasOwnProperty.call(FileExecutablesForURLStrings, URLString))
            fileExecutables.push(FileExecutablesForURLStrings[URLString]);

    return fileExecutables;
}
#endif

FileExecutable.prototype.execute = function(/*BOOL*/ shouldForce)
{
    if (this._hasExecuted && !shouldForce)
        return;

    this._hasExecuted = YES;

    Executable.prototype.execute.call(this);
}

DISPLAY_NAME(FileExecutable.prototype.execute);

FileExecutable.prototype.hasExecuted = function()
{
    return this._hasExecuted;
}

DISPLAY_NAME(FileExecutable.prototype.hasExecuted);

function decompile(/*String*/ aString, /*CFURL*/ aURL)
{
    var stream = new MarkedStream(aString);
/*
    if (stream.version !== "1.0")
        return;
*/
    var marker = NULL,
        code = "",
        dependencies = [];

    while (marker = stream.getMarker())
    {
        var text = stream.getString();

        if (marker === MARKER_TEXT)
            code += text;

        else if (marker === MARKER_IMPORT_STD)
            dependencies.push(new FileDependency(new CFURL(text), NO));

        else if (marker === MARKER_IMPORT_LOCAL)
            dependencies.push(new FileDependency(new CFURL(text), YES));
    }

    return new Executable(code, dependencies, aURL);
}
