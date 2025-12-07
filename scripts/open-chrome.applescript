(*
Copyright (c) 2015-present, Facebook, Inc.
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.

=== SCRIPT PURPOSE ===
This AppleScript is used by the "better-opn" npm package to intelligently open URLs in Chrome.
Instead of always opening a new tab, it:
1. Reuses an existing tab if one already has the target URL (useful for dev server hot-reloading)
2. Reuses an empty "New Tab" page if available
3. Only creates a new tab as a last resort

This is particularly useful for React/Expo development where you want to avoid
accumulating dozens of localhost tabs when the dev server restarts.
*)

(* 
=== PROPERTY DECLARATIONS ===
Properties in AppleScript are like global variables that persist across handler calls.
They're declared at the top level and can be accessed/modified by any handler in the script.
*)

-- Stores a reference to the Chrome tab object we find (if any)
property targetTab: null

-- Stores the numeric index (1-based) of the tab within its window
-- -1 indicates "not found yet"
property targetTabIndex: -1

-- Stores a reference to the Chrome window object containing the target tab
property targetWindow: null

-- The browser application to control. Defaults to Chrome but can be overridden
-- This allows the script to work with Chrome-based browsers like Brave, Edge, etc.
property theProgram: "Google Chrome"

(*
=== MAIN ENTRY POINT ===
"on run argv" is the main handler that executes when the script is called.
"argv" is a list of command-line arguments passed to the script.

Usage: osascript better-opn-chrome.applescript <theURL> <matchURL> [browserName]
  - theURL: The full URL to open (e.g., "http://localhost:3000")
  - matchURL: A partial URL to search for in existing tabs (e.g., "localhost:3000")
  - browserName: Optional - which browser to use (defaults to "Google Chrome")
*)
on run argv
  -- Extract the first argument: the URL we want to open/navigate to
  set theURL to item 1 of argv
  
  -- Extract the second argument: the URL pattern to search for in existing tabs
  -- This can be a partial match (e.g., just "localhost:3000" instead of full URL)
  set matchURL to item 2 of argv

  -- Check if a third argument was provided (the browser name)
  -- "count of argv" returns the number of arguments passed
  -- If more than 2 arguments exist, use the 3rd one as the browser name
  if (count of argv) > 2 then
    set theProgram to item 3 of argv
  end if

  (*
  "using terms from application" is a compilation directive.
  It tells AppleScript to use Google Chrome's scripting dictionary (terminology)
  to understand commands like "make new tab", "reload", etc.
  
  This is necessary because we're using a variable (theProgram) for the app name,
  but AppleScript needs to know the command vocabulary at compile time.
  The actual commands will be sent to whatever app is in theProgram at runtime.
  *)
  using terms from application "Google Chrome"
    -- "tell application" sends all enclosed commands to the specified application
    tell application theProgram

      -- Check if Chrome has any windows open
      -- "count every window" returns the number of open browser windows
      -- If no windows exist, create one so we have somewhere to put our tab
      if (count every window) = 0 then
        make new window
      end if

      (*
      === STRATEGY 1: Find and reload an existing tab with matching URL ===
      This is the primary use case for dev servers.
      If we find a tab already showing our URL (like localhost:3000),
      we just reload it instead of opening a duplicate.
      
      "my lookupTabWithUrl" calls our custom handler defined below.
      "my" is required to call handlers from within a "tell" block,
      otherwise AppleScript would try to send it to Chrome as a command.
      *)
      set found to my lookupTabWithUrl(matchURL)
      if found then
        -- Switch to the found tab by setting its window's active tab index
        -- This makes our target tab the currently visible/selected tab
        set targetWindow's active tab index to targetTabIndex
        
        -- Send the reload command to the tab to refresh its content
        tell targetTab to reload
        
        -- Activate the window (bring it to foreground and give it focus)
        tell targetWindow to activate
        
        -- Move this window to the front of all Chrome windows
        -- "index of 1" means it becomes the frontmost window
        set index of targetWindow to 1
        
        -- Exit the script early - we're done!
        return
      end if

      (*
      === STRATEGY 2: Reuse an empty "New Tab" page ===
      If we didn't find an existing tab with our URL, check for an empty tab.
      Chrome's new tab page has the URL "chrome://newtab/"
      This avoids creating unnecessary new tabs when the user already has one ready.
      *)
      set found to my lookupTabWithUrl("chrome://newtab/")
      if found then
        -- Switch to the empty tab
        set targetWindow's active tab index to targetTabIndex
        
        -- Navigate the empty tab to our desired URL
        -- This changes the tab's URL property, causing it to load the new page
        set URL of targetTab to theURL
        
        -- Bring the window to the front
        tell targetWindow to activate
        
        -- Exit early
        return
      end if

      (*
      === STRATEGY 3: Create a brand new tab ===
      We only reach here if:
      - No existing tab has our URL
      - No empty "New Tab" pages exist
      So we create a new tab in the frontmost window (window 1).
      *)
      tell window 1
        -- Bring this window to focus
        activate
        
        -- Create a new tab with the URL property set to our target
        -- The tab will automatically start loading the URL
        make new tab with properties {URL:theURL}
      end tell
    end tell
  end using terms from
end run

(*
=== CUSTOM HANDLER: lookupTabWithUrl ===
This handler searches through ALL open Chrome windows and tabs
to find one whose URL contains the specified search string.

Parameters:
  - lookupUrl: The URL pattern to search for (can be partial)

Returns:
  - true if a matching tab was found, false otherwise

Side Effects:
  - If found, sets the global properties: targetTab, targetTabIndex, targetWindow
  - These properties are used by the caller to interact with the found tab
*)
on lookupTabWithUrl(lookupUrl)
  -- Again, we need Chrome's terminology for tab/window commands
  using terms from application "Google Chrome"
    tell application theProgram
      -- Initialize our "found" flag to false
      set found to false
      
      -- Initialize tab index (will be set properly in the loop)
      set theTabIndex to -1
      
      (*
      === NESTED LOOP: Iterate through all windows and their tabs ===
      Outer loop: goes through each Chrome window
      Inner loop: goes through each tab in the current window
      
      "repeat with theWindow in every window" creates an iterator
      that assigns each window object to theWindow one at a time.
      *)
      repeat with theWindow in every window
        -- Reset tab counter for each window (tabs are indexed per-window)
        set theTabIndex to 0
        
        -- Inner loop: iterate through each tab in this window
        repeat with theTab in every tab of theWindow
          -- Increment our manual tab counter
          -- (AppleScript tabs are 1-indexed, so first tab = 1)
          set theTabIndex to theTabIndex + 1
          
          (*
          Check if this tab's URL contains our search string.
          "theTab's URL" gets the URL property of the tab.
          "as string" ensures we're working with text (not a URL object).
          "contains" does a substring match - it returns true if
          lookupUrl appears anywhere in the tab's URL.
          
          Example: "http://localhost:3000/home" contains "localhost:3000" → true
          *)
          if (theTab's URL as string) contains lookupUrl then
            -- FOUND IT! Store references in our global properties
            -- so the main handler can use them after we return.
            
            -- Store the actual tab object reference
            set targetTab to theTab
            
            -- Store the numeric index (used to switch to this tab)
            set targetTabIndex to theTabIndex
            
            -- Store the window containing this tab
            set targetWindow to theWindow
            
            -- Mark as found
            set found to true
            
            -- Exit the inner loop immediately (no need to check more tabs)
            exit repeat
          end if
        end repeat

        -- If we found a match, also exit the outer loop
        -- (no need to check other windows)
        if found then
          exit repeat
        end if
      end repeat
    end tell
  end using terms from
  
  -- Return whether we found a matching tab
  return found
end lookupTabWithUrl
