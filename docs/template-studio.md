# Internal template studio

Run `npm run dev` and open http://127.0.0.1:5173/template-maker/ (use the port printed by Vite). Old local `?templateStudio` links redirect there, retaining draft parameters.

The maker is a separate HTML page and entry bundle at `/template-maker/`, with no navigation link from the main app and a noindex directive. It is unlisted, not authenticated. Its editor and draft library also work in a production build. Publishing and main-app asset approval require the local development server; those write actions are disabled or absent on the deployed page. Download a draft from File to transfer work to the local maker.

Choose **New template**, enter a name and select Portrait, Square or Landscape. Template drafts have their own library, separate from normal boards. The workspace has one toolbar and retains assets, uploads, text, drawing, image editing, layers and Undo. Use **File > Download draft file** for a backup. Earlier studio board links open a template copy and preserve the original board.

Click **Publish** to review the preview, name and description in a dialog, then choose **Publish to app**. Publishing writes a portable project and preview into src/vision/publishedTemplates. Uploaded images are included. Publishing the same draft again updates its entry.

Open the main app in another tab and select Templates to use it. Applying a published template replaces the page, size and background after confirmation; Undo restores the previous board. Check the result before releasing.

Templates lists published designs only. The old Torn Scrapbook, Soft Life Collage and Sticker Chaos presets are retired from the library; existing boards made with them remain supported.

Commit the published JSON file and deploy the app using your normal release process to make it available to everyone. Publishing does not automatically push Git commits or deploy. To retire a template, delete its JSON file and redeploy; boards already created from it retain their content.

The publishing API is available only through the local development server, requires a same-origin JSON request over loopback, and is absent from the production build. Publishing is not a hosted multi-user admin service. Keep Vite local when authoring. Templates may be up to 40 MB including photos and preview; smaller photos keep deployments lighter.

## Cutout workshop

In the main app, choose the **Digital cutouts** pill beside **All artwork** in Elements. It uses the normal asset grid and theme-pill interaction. The collection dropdown is only used in the template maker.

In the local template studio, open **Elements**. **Digital cutouts** contains the original six photographic objects plus 26 reviewed lifestyle cutouts, through the Diptyque candle. Those 26 approved pieces are also available in the main app's Elements library. The last four review items were excluded. **Paper cutouts** contains torn notes, scraps and wide dividers. Click or drag a piece onto your board. Both collections support saved boards, templates and image exports.

New cutouts stay out of the main app's Elements library until you choose **Add to main app** on an individual piece. **Remove from main app** reverses that selection. These controls update `src/assets/approvedCutouts.json`; commit that file and the artwork and deploy to update the live library. Previously saved boards and published templates still resolve their cutouts even if those pieces are removed from the browse library.



Digital cutouts keep their white sticker silhouette. Select a piece and use Edge style to switch between None and Smooth white sticker.

## Ready-made paper cutouts

Choose **Paper cutouts** in the Elements collection selector. There are 24 torn-paper pieces: wide notes, square notes, tall scraps, quote strips, vertical strips, oval scraps, arched scraps and corner tears in cream, kraft and blush. The six page-wide dividers remain available too.

Click or drag a piece onto the canvas. Resize and rotate it with the usual canvas handles, then send it behind photos or text. Change a new piece's face color under **Graphic colors**; the grain and fibrous edges remain part of the artwork. No outline editing is needed. Add favorites to the main app using the existing per-piece approval button.

The torn-paper editing controls have been removed. Previously saved photo and shape paper effects still render, save and export. Their Edge style shows Saved paper edge; choose None to remove one.
