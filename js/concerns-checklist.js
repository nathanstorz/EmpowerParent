(function () {
    var form = document.getElementById('checklist-form');
    var statusEl = document.getElementById('chk-status');
    var button = form.querySelector('.chk-download');

    var TEAL = [160, 242, 231];
    var PAGE_W = 612;
    var PAGE_H = 792;
    var MARGIN = 54;
    var BOTTOM = PAGE_H - 70;

    // Loads the logo so it can go in the PDF. If it can't load, the PDF is made without it.
    function loadLogo(src) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () {
                try {
                    var canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    resolve({
                        data: canvas.toDataURL('image/png'),
                        w: img.naturalWidth,
                        h: img.naturalHeight
                    });
                } catch (err) {
                    resolve(null);
                }
            };
            img.onerror = function () { resolve(null); };
            img.src = src;
        });
    }

    // Reads the page and returns [{ title, items: [...] }] for checked items only.
    function getAnswers() {
        var sections = [];
        document.querySelectorAll('.chk-section').forEach(function (section) {
            var items = [];
            section.querySelectorAll('.chk-item input:checked').forEach(function (box) {
                items.push(box.closest('.chk-item').querySelector('span').textContent.trim());
            });
            if (items.length) {
                sections.push({
                    title: section.querySelector('h2').textContent.trim(),
                    items: items
                });
            }
        });
        return sections;
    }

    function buildPdf(sections, logo) {
        var doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' });
        var y;
        var total = sections.reduce(function (n, s) { return n + s.items.length; }, 0);

        function ensureSpace(height) {
            if (y + height > BOTTOM) {
                doc.addPage();
                y = MARGIN;
            }
        }

        // HEADER BAND
        doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
        doc.rect(0, 0, PAGE_W, 96, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(2);
        doc.line(0, 96, PAGE_W, 96);

        var textX = MARGIN;
        if (logo) {
            var logoH = 64;
            var logoW = logoH * logo.w / logo.h;
            doc.addImage(logo.data, 'PNG', MARGIN, 16, logoW, logoH);
            textX = MARGIN + logoW + 20;
        }

        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'bold');
        doc.setFontSize(22);
        doc.text('Concerns Checklist', textX, 50);

        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.text('Partners in Educational Advocacy', textX, 70);

        var today = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        doc.text(today, PAGE_W - MARGIN, 50, { align: 'right' });

        // INTRO
        y = 134;
        doc.setFont('times', 'bold');
        doc.setFontSize(17);
        doc.text('Where Is My Child Having Difficulty?', MARGIN, y);
        y += 22;

        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.text('Concerns checked: ' + total, MARGIN, y);
        y += 30;

        // SECTIONS
        sections.forEach(function (section) {
            ensureSpace(60);

            doc.setFont('times', 'bold');
            doc.setFontSize(15);
            doc.setTextColor(0, 0, 0);
            doc.text(section.title, MARGIN, y);

            doc.setDrawColor(TEAL[0], TEAL[1], TEAL[2]);
            doc.setLineWidth(3);
            doc.line(MARGIN, y + 8, PAGE_W - MARGIN, y + 8);
            y += 30;

            doc.setFont('times', 'normal');
            doc.setFontSize(12.5);

            section.items.forEach(function (text) {
                var lines = doc.splitTextToSize(text, PAGE_W - MARGIN * 2 - 26);
                var rowHeight = lines.length * 16 + 6;
                ensureSpace(rowHeight);

                // checked box
                doc.setDrawColor(0, 0, 0);
                doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
                doc.setLineWidth(1.2);
                doc.roundedRect(MARGIN, y - 10, 13, 13, 2, 2, 'FD');
                doc.setLineWidth(1.6);
                doc.line(MARGIN + 3, y - 3.5, MARGIN + 6, y - 0.5);
                doc.line(MARGIN + 6, y - 0.5, MARGIN + 10.5, y - 8);

                doc.setTextColor(0, 0, 0);
                doc.text(lines, MARGIN + 26, y);
                y += rowHeight;
            });

            y += 14;
        });

        // CLOSING NOTE
        ensureSpace(100);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.line(MARGIN, y, PAGE_W - MARGIN, y);
        y += 24;

        doc.setFont('times', 'bold');
        doc.setFontSize(13);
        doc.text('Next step', MARGIN, y);
        y += 18;

        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        var note = 'Bring this checklist to a free consultation with Partners in Educational ' +
                   'Advocacy. This checklist is not an evaluation or a diagnosis. It is a tool ' +
                   'to help you describe your concerns.';
        doc.text(doc.splitTextToSize(note, PAGE_W - MARGIN * 2), MARGIN, y);

        // FOOTER ON EVERY PAGE
        var pages = doc.getNumberOfPages();
        for (var i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFont('times', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(90, 90, 90);
            doc.text(
                'Partners in Educational Advocacy  |  romo@empowerparent.com  |  rochlin@empowerparent.com',
                PAGE_W / 2, PAGE_H - 36, { align: 'center' }
            );
            doc.text('Page ' + i + ' of ' + pages, PAGE_W / 2, PAGE_H - 22, { align: 'center' });
        }

        doc.save('concerns-checklist.pdf');
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        statusEl.textContent = '';

        var sections = getAnswers();
        if (!sections.length) {
            statusEl.textContent = 'Please check at least one item to download your checklist.';
            return;
        }

        if (!window.jspdf) {
            statusEl.textContent = 'The PDF tool could not load. Please check your connection and try again.';
            return;
        }

        button.disabled = true;
        button.textContent = 'Creating your PDF...';

        loadLogo('assets/images/PEA_logo.png').then(function (logo) {
            try {
                buildPdf(sections, logo);
                statusEl.textContent = 'Your checklist has been downloaded.';
            } catch (err) {
                statusEl.textContent = 'Something went wrong creating the PDF. Please try again.';
            }
            button.disabled = false;
            button.textContent = 'Download My Checklist (PDF)';
        });
    });
})();