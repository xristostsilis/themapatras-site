# Θέμα Πάτρας 98.7 FM

Στατικό site (HTML + CSS + JS, χωρίς build). Κάνε deploy ως **Static Site** στο DigitalOcean App Platform
με source directory `/` και χωρίς build command.

- Ώρες αναμετάδοσης Mega News 104,6: `app.js` → `WD` (καθημερινές) και `WE` (Σαββατοκύριακο).
- Λογότυπο Mega: αντικατέστησε το `images/mega-logo.png` (512×512 PNG).
- Φόρμα επικοινωνίας: ανοίγει το email του χρήστη (mailto) προς themapatras@gmail.com· δεν χρειάζεται υπηρεσία τρίτου.
- Αν το domain δεν είναι το themapatras.gr, άλλαξε τα `canonical`, `og:url`, `og:image` στο `index.html`.

## SEO / διευθύνσεις
- Κάθε σελίδα έχει πραγματικό URL (`/programma/`, `/diafimisi/`, `/epikoinonia/`, `/oroi-xrisis/`, `/aporrito/`, `/cookies/`, `/taytotita/`) με δικό της τίτλο, περιγραφή και canonical. Τα φακελάκια παράγονται από το `index.html` (script build.py, κρατάει ο Claude). Αν αλλάξει το `index.html`, ξαναπαράγονται.
- `sitemap.xml` και `robots.txt` υπάρχουν στη ρίζα. Παλιοί σύνδεσμοι `/#/programma` ανακατευθύνονται αυτόματα.
