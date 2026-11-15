# Security

## What this site does with your information

Ashesha is a static website. It has no server code, no accounts, no login, no cookies, no analytics and no adverts.

- Candidates you mark, your notes, your sky map, your collection of Messier objects and your theme choice are kept in your own browser (local storage). They are never sent anywhere. Clearing your browser's site data removes them.
- The birthday you choose in Your Beginnings is not saved. The page only opens that day's data file from this site. A card link you copy holds the date, so share it only with people you would tell your birthday.
- The only outside address the pages load from is Google Fonts, for the Atkinson Hyperlegible typeface. Links to LinkedIn and to the IRSA archive open only when you press them.
- The site is hosted on GitHub Pages. Like any web host, GitHub sees the address of each file your browser asks for. So does Google, for the font.

## How the site is protected

- Every page carries a Content-Security-Policy that allows only the site's own files and the font to load, and blocks the page from contacting any other address in the background.
- Text you type (notes, a name for the card, a sky position) is always shown as plain text, never run as code.
- The site is published by a GitHub Actions workflow with the smallest permissions it needs. The workflow checks every page link, data file and script before publishing.
- The repository holds no passwords, keys or tokens.

## Reporting a problem

If you find a security or privacy problem, please tell us privately first. On GitHub, open the repository's **Security** tab and choose **Report a vulnerability**. If that is not available, open an issue that says only that you have a security report, without the details, and we will reply there.

We are a small student team and will answer as soon as we can.
