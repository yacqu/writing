Writing
=======

**Writing** is a lightweight distraction-free text editor, in the browser.

Live version: [Writing](https://josephernest.github.io/writing/).

<img src="http://i.imgur.com/c56hDwi.gif" />


Installation
----

### Option 1: Standalone (Browser Only)
Just open `index.html` in your browser and that's it! There is no server code needed. Is that so simple? Yes!

### Option 2: With File System Integration (NEW!)
Run the TypeScript server to enable file system access and persistent file editing:

```bash
# Install dependencies
npm install

# Start the server (default: ~/Documents/notes)
npm start

# Or specify a custom directory
BASE_DIR=/path/to/your/notes npm start
```

Then open `http://localhost:3031` in your browser.

**Features in server mode:**
* 📁 File tree sidebar with folder navigation
* 💾 Save files directly to your file system (Ctrl+S)
* 📄 Create new files and folders
* 🔄 Auto-refresh file tree
* 🔒 Secure: Only accesses files within the configured BASE_DIR

Usage
----

* CTRL + D: Toggle display mode (split, preview only, editor only)

* CTRL + P: Print or export as PDF

* CTRL + S: Save file (to filesystem in server mode, or download as .MD in standalone mode)

* CTRL + SHIFT + O: Open .MD file (standalone mode only)

and a few other commands (change font, dark mode, LaTeX, etc.) that can be found in:

* CTRL+SHIFT+H or `?` top-right icon: Show help


Why another Markdown editor? Why not just use StackEdit?
----
There are many online editors that support Markdown but:

* half of them don't support LaTeX / MathJax (for math formulas)
* some of them do, but have a **1-sec delay between keypress and display**, and I find this annoying, see e.g. [StackEdit](https://stackedit.io)
* some of them have annoying flickering each time you write new text, once math is present on the page
* most of them are not minimalist / distraction-free enough for me

That's why I decided to make **Writing**:

* open-source
* no server needed, you can run it offline
* fast rendering (no delay when writing / no flickering of math equations)
* **just what you need: write, preview, save the code, print or save as PDF, and nothing else**
* LPWP website, a.k.a. "Landing Page=Working Page", i.e. the first page that you visit on the website is the page *where things actually happen*, that means that there is no annoying welcome page or login page, etc.

Server Architecture (Optional)
----

The server mode adds a Node.js/TypeScript backend with these components:

* **Express REST API** for file operations (list, read, save, create, delete, rename)
* **Security middleware** to prevent path traversal attacks and restrict access to BASE_DIR
* **File tree UI** with sidebar for easy navigation
* **Auto-save support** with unsaved changes indicator

**API Endpoints:**
* `GET /api/files?path=<path>` - List directory contents
* `GET /api/file?path=<path>` - Read file content
* `POST /api/file` - Save file content
* `POST /api/create` - Create new file or directory
* `DELETE /api/file?path=<path>` - Delete file or directory
* `PUT /api/file` - Rename/move file

**Configuration:**
Edit `server/config.ts` to customize:
* `BASE_DIR` - Root directory for file access
* `PORT` - Server port (default: 3031)
* `ALLOWED_EXTENSIONS` - Filter allowed file types
* `ENABLE_DELETE` / `ENABLE_CREATE` - Enable/disable operations

See `design.md` for detailed architecture documentation.

About
----
Author: Joseph Ernest ([@JosephErnest](https://twitter.com/JosephErnest))

Other projects: [BigPicture](http://bigpicture.bi), [bigpicture.js](https://github.com/josephernest/bigpicture.js), [AReallyBigPage](https://github.com/josephernest/AReallyBigPage), [SamplerBox](http://www.samplerbox.org), [Void](https://github.com/josephernest/void), [TalkTalkTalk](https://github.com/josephernest/TalkTalkTalk), [sdfgh](https://github.com/josephernest/sdfgh), [RaspFIP](https://github.com/josephernest/RaspFIP/), [Yopp](https://github.com/josephernest/Yopp), etc.

Sponsoring and consulting
----

I am available for Python, Data science, ML, Automation consulting. Please contact me on https://afewthingz.com for freelancing requests.

Do you want to support the development of my open-source projects? Please contact me!

I am currently sponsored by [CodeSigningStore.com](https://codesigningstore.com/). Thank you to them for providing a DigiCert Code Signing Certificate and supporting open source software.

License
----
MIT license

Dependencies
---
**Writing** uses [Pagedown](https://code.google.com/archive/p/pagedown/), [Pagedown Extra](https://github.com/jmcmanus/pagedown-extra), [MathJax](https://www.mathjax.org/), StackOverflow's [editor code](https://gist.github.com/gdalgas/a652bce3a173ddc59f66), and the [Computer Modern](http://cm-unicode.sourceforge.net/) font.

*Note: Some of these libraries have been slightly modified (a few lines of code), to make it work all together, that's why they are included in this package.*

![](https://gget.it/pixel/writing.png)
