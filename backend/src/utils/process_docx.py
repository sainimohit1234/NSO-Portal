import sys
import zipfile
import re
import xml.etree.ElementTree as ET

def get_paragraph_text(p, ns):
    texts = []
    for t in p.findall('.//w:t', ns):
        if t.text:
            texts.append(t.text)
    return "".join(texts)

def restructure_document(root, ns, date_str):
    parent_map = {c: p for p in root.iter() for c in p}
    
    # Tighten spacing for all paragraphs before the first signature block to ensure they fit on Page 1
    found_p1_sig = False
    for p in root.findall('.//w:p', ns):
        text = get_paragraph_text(p, ns)
        if 'Executed on behalf of the Restaurant Partner' in text and 'Signatory email:' in text:
            found_p1_sig = True
        if found_p1_sig:
            break
        
        pPr = p.find('w:pPr', ns)
        if pPr is None:
            pPr = ET.Element(f'{{{ns["w"]}}}pPr')
            p.insert(0, pPr)
        spacing = pPr.find('w:spacing', ns)
        if spacing is None:
            spacing = ET.Element(f'{{{ns["w"]}}}spacing')
            pPr.append(spacing)
        spacing.set(f'{{{ns["w"]}}}after', '10')
        spacing.set(f'{{{ns["w"]}}}before', '0')
        spacing.set(f'{{{ns["w"]}}}line', '160')
        spacing.set(f'{{{ns["w"]}}}lineRule', 'auto')

    # 1. Update Effective Date box (removes Excel Sheets field code and sets static date)
    for p in root.findall('.//w:p', ns):
        text = get_paragraph_text(p, ns)
        if 'Effective Date' in text and ':' in text:
            pPr = p.find('w:pPr', ns)
            rPr = None
            first_r = p.find('w:r', ns)
            if first_r is not None:
                rPr = first_r.find('w:rPr', ns)
            
            for child in list(p):
                p.remove(child)
            
            if pPr is not None:
                p.append(pPr)
            
            new_r = ET.Element(f'{{{ns["w"]}}}r')
            if rPr is not None:
                new_r.append(rPr)
            new_t = ET.Element(f'{{{ns["w"]}}}t')
            new_t.text = f"Effective Date: {date_str}"
            new_r.append(new_t)
            p.append(new_r)
            break

    # 2. Merge Paragraphs 73 and 76 (remove 74, 75, 76 spacing breaks)
    p73 = None
    p76 = None
    for p in root.findall('.//w:p', ns):
        text = get_paragraph_text(p, ns)
        if 'Discouraged practices and offers:' in text and 'sending any marketing material' in text:
            p73 = p
        elif 'including flyers, brochures, etc., to Customers' in text:
            p76 = p
            
    if p73 is not None and p76 is not None:
        parent = parent_map[p73]
        children = list(parent)
        idx73 = children.index(p73)
        idx76 = children.index(p76)
        
        p76_text = "".join([t.text for t in p76.findall('.//w:t', ns) if t.text])
        last_r = p73.findall('.//w:r', ns)[-1]
        last_t = last_r.find('w:t', ns)
        if last_t is not None:
            last_t.text = (last_t.text or "").rstrip() + " " + p76_text.lstrip()
        
        for idx in range(idx73 + 1, idx76 + 1):
            parent.remove(children[idx])

    # Re-build parent map
    parent_map = {c: p for p in root.iter() for c in p}

    # 3. Collect paragraph references first to avoid double-matching after modification
    p1_sig = None
    p1_sig_next = None
    for p in root.findall('.//w:p', ns):
        text = get_paragraph_text(p, ns)
        if 'Executed on behalf of the Restaurant Partner' in text and 'Signatory email:' in text:
            p1_sig = p
            parent = parent_map[p]
            children = list(parent)
            idx = children.index(p)
            if idx + 1 < len(children):
                p1_sig_next = children[idx + 1]
            break

    p2_sig = None
    p2_email = None
    p2_signed_at = None
    p2_signature = None
    for p in root.findall('.//w:p', ns):
        if p == p1_sig:
            continue
        text = get_paragraph_text(p, ns)
        if 'Executed on behalf of the Restaurant Partner' in text:
            p2_sig = p
            parent = parent_map[p]
            children = list(parent)
            idx = children.index(p)
            if idx + 1 < len(children):
                p2_email = children[idx + 1]
            if idx + 2 < len(children):
                p2_signed_at = children[idx + 2]
            if idx + 4 < len(children):
                p2_signature = children[idx + 4]
            break

    # Now execute transformations using the pre-collected references
    if p1_sig is not None:
        parent = parent_map[p1_sig]
        drawing = p1_sig.find('.//w:drawing', ns)
        
        pPr = p1_sig.find('w:pPr', ns)
        if pPr is None:
            pPr = ET.Element(f'{{{ns["w"]}}}pPr')
            p1_sig.insert(0, pPr)
        keepNext = pPr.find('w:keepNext', ns)
        if keepNext is None:
            keepNext = ET.Element(f'{{{ns["w"]}}}keepNext')
            pPr.insert(0, keepNext)
        spacing_sig = pPr.find('w:spacing', ns)
        if spacing_sig is None:
            spacing_sig = ET.Element(f'{{{ns["w"]}}}spacing')
            pPr.append(spacing_sig)
        spacing_sig.set(f'{{{ns["w"]}}}after', '0')
        spacing_sig.set(f'{{{ns["w"]}}}before', '0')
        
        rPr = None
        first_r = p1_sig.find('w:r', ns)
        if first_r is not None:
            rPr = first_r.find('w:rPr', ns)
            
        for child in list(p1_sig):
            if child.tag != f'{{{ns["w"]}}}pPr':
                p1_sig.remove(child)
            
        new_r = ET.Element(f'{{{ns["w"]}}}r')
        if rPr is not None:
            new_r.append(rPr)
        new_t = ET.Element(f'{{{ns["w"]}}}t')
        new_t.text = "Executed on behalf of the Restaurant Partner by its Authorized Signatory:"
        new_r.append(new_t)
        p1_sig.append(new_r)
        
        # Left-aligned picture paragraph
        img_p = ET.Element(f'{{{ns["w"]}}}p')
        img_pPr = ET.Element(f'{{{ns["w"]}}}pPr')
        jc = ET.Element(f'{{{ns["w"]}}}jc')
        jc.set(f'{{{ns["w"]}}}val', 'left')
        img_pPr.append(jc)
        spacing = ET.Element(f'{{{ns["w"]}}}spacing')
        spacing.set(f'{{{ns["w"]}}}after', '0')
        spacing.set(f'{{{ns["w"]}}}before', '0')
        img_pPr.append(spacing)
        img_p_keep = ET.Element(f'{{{ns["w"]}}}keepNext')
        img_pPr.insert(0, img_p_keep)
        img_p.append(img_pPr)
        
        if drawing is not None:
            # Scale down the drawing by 35% to help it fit on page 1
            extent = drawing.find('.//{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}extent')
            if extent is not None:
                extent.set('cx', '673417')
                extent.set('cy', '320040')
            ext = drawing.find('.//{http://schemas.openxmlformats.org/drawingml/2006/main}ext')
            if ext is not None:
                ext.set('cx', '673417')
                ext.set('cy', '320040')

            img_r = ET.Element(f'{{{ns["w"]}}}r')
            img_rPr = ET.Element(f'{{{ns["w"]}}}rPr')
            no_proof = ET.Element(f'{{{ns["w"]}}}noProof')
            img_rPr.append(no_proof)
            img_r.append(img_rPr)
            img_r.append(drawing)
            img_p.append(img_r)
            
        # Email paragraph
        email_p = ET.Element(f'{{{ns["w"]}}}p')
        email_pPr = ET.Element(f'{{{ns["w"]}}}pPr')
        spacing_email = ET.Element(f'{{{ns["w"]}}}spacing')
        spacing_email.set(f'{{{ns["w"]}}}after', '0')
        spacing_email.set(f'{{{ns["w"]}}}before', '0')
        email_pPr.append(spacing_email)
        email_p_keep = ET.Element(f'{{{ns["w"]}}}keepNext')
        email_pPr.insert(0, email_p_keep)
        email_p.append(email_pPr)
        
        email_r = ET.Element(f'{{{ns["w"]}}}r')
        if rPr is not None:
            email_r.append(rPr)
        email_t = ET.Element(f'{{{ns["w"]}}}t')
        email_t.text = f"Signatory email: satwik.s@bluetokaicoffee.com   Signed at: {date_str}"
        email_r.append(email_t)
        email_p.append(email_r)
        
        children = list(parent)
        idx = children.index(p1_sig)
        parent.insert(idx + 1, img_p)
        parent.insert(idx + 2, email_p)
        
        if p1_sig_next is not None:
            pPr_next = p1_sig_next.find('w:pPr', ns)
            if pPr_next is None:
                pPr_next = ET.Element(f'{{{ns["w"]}}}pPr')
                p1_sig_next.insert(0, pPr_next)
            spacing_next = pPr_next.find('w:spacing', ns)
            if spacing_next is None:
                spacing_next = ET.Element(f'{{{ns["w"]}}}spacing')
                pPr_next.append(spacing_next)
            spacing_next.set(f'{{{ns["w"]}}}after', '0')
            spacing_next.set(f'{{{ns["w"]}}}before', '0')
            
            rPr_next = None
            first_r_next = p1_sig_next.find('w:r', ns)
            if first_r_next is not None:
                rPr_next = first_r_next.find('w:rPr', ns)
                
            for child in list(p1_sig_next):
                if child.tag != f'{{{ns["w"]}}}pPr':
                    p1_sig_next.remove(child)
                
            sig_r = ET.Element(f'{{{ns["w"]}}}r')
            if rPr_next is not None:
                sig_r.append(rPr_next)
            sig_t = ET.Element(f'{{{ns["w"]}}}t')
            sig_t.text = "Signed with IP                                                                                                                                            Signature  "
            sig_r.append(sig_t)
            p1_sig_next.append(sig_r)

    # 4. Transform Annexure B Signature block
    if p2_sig is not None:
        parent = parent_map[p2_sig]
        drawing2 = p2_sig.find('.//w:drawing', ns)
        
        pPr = p2_sig.find('w:pPr', ns)
        rPr = None
        first_r = p2_sig.find('w:r', ns)
        if first_r is not None:
            rPr = first_r.find('w:rPr', ns)
            
        for child in list(p2_sig):
            p2_sig.remove(child)
        if pPr is not None:
            p2_sig.append(pPr)
            
        new_r = ET.Element(f'{{{ns["w"]}}}r')
        if rPr is not None:
            new_r.append(rPr)
        new_t = ET.Element(f'{{{ns["w"]}}}t')
        new_t.text = "Executed on behalf of the Restaurant Partner by its Authorized Signatory:"
        new_r.append(new_t)
        p2_sig.append(new_r)
        
        # Left-aligned picture paragraph
        img_p2 = ET.Element(f'{{{ns["w"]}}}p')
        img_p2Pr = ET.Element(f'{{{ns["w"]}}}pPr')
        jc = ET.Element(f'{{{ns["w"]}}}jc')
        jc.set(f'{{{ns["w"]}}}val', 'left')
        img_p2Pr.append(jc)
        spacing = ET.Element(f'{{{ns["w"]}}}spacing')
        spacing.set(f'{{{ns["w"]}}}after', '60')
        img_p2Pr.append(spacing)
        img_p2.append(img_p2Pr)
        
        if drawing2 is not None:
            img_r2 = ET.Element(f'{{{ns["w"]}}}r')
            img_r2Pr = ET.Element(f'{{{ns["w"]}}}rPr')
            no_proof = ET.Element(f'{{{ns["w"]}}}noProof')
            img_r2Pr.append(no_proof)
            img_r2.append(img_r2Pr)
            img_r2.append(drawing2)
            img_p2.append(img_r2)
            
        children = list(parent)
        idx = children.index(p2_sig)
        parent.insert(idx + 1, img_p2)
        
        # Email paragraph
        if p2_email is not None:
            pPr_email = p2_email.find('w:pPr', ns)
            rPr_email = None
            first_r_email = p2_email.find('w:r', ns)
            if first_r_email is not None:
                rPr_email = first_r_email.find('w:rPr', ns)
                
            for child in list(p2_email):
                p2_email.remove(child)
            if pPr_email is not None:
                p2_email.append(pPr_email)
                
            email_r = ET.Element(f'{{{ns["w"]}}}r')
            if rPr_email is not None:
                email_r.append(rPr_email)
            email_t = ET.Element(f'{{{ns["w"]}}}t')
            email_t.text = "Signatory email: satwik.s@bluetokaicoffee.com"
            email_r.append(email_t)
            p2_email.append(email_r)
            
        # Signed at paragraph
        if p2_signed_at is not None:
            pPr_sa = p2_signed_at.find('w:pPr', ns)
            rPr_sa = None
            first_r_sa = p2_signed_at.find('w:r', ns)
            if first_r_sa is not None:
                rPr_sa = first_r_sa.find('w:rPr', ns)
                
            for child in list(p2_signed_at):
                p2_signed_at.remove(child)
            if pPr_sa is not None:
                p2_signed_at.append(pPr_sa)
                
            sa_r = ET.Element(f'{{{ns["w"]}}}r')
            if rPr_sa is not None:
                sa_r.append(rPr_sa)
            sa_t = ET.Element(f'{{{ns["w"]}}}t')
            sa_t.text = f"Signed at: {date_str} Signed with IP:"
            sa_r.append(sa_t)
            p2_signed_at.append(sa_r)
            
        # Signature paragraph
        if p2_signature is not None:
            pPr_sig = p2_signature.find('w:pPr', ns)
            rPr_sig = None
            first_r_sig = p2_signature.find('w:r', ns)
            if first_r_sig is not None:
                rPr_sig = first_r_sig.find('w:rPr', ns)
                
            for child in list(p2_signature):
                p2_signature.remove(child)
            if pPr_sig is not None:
                p2_signature.append(pPr_sig)
                
            sig_r2 = ET.Element(f'{{{ns["w"]}}}r')
            if rPr_sig is not None:
                sig_r2.append(rPr_sig)
            sig_t2 = ET.Element(f'{{{ns["w"]}}}t')
            sig_t2.text = "Signature"
            sig_r2.append(sig_t2)
            p2_signature.append(sig_r2)

def process_docx(input_path, output_path, brand_name, cafe_name, address_str, date_str):
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
          'v': 'urn:schemas-microsoft-com:vml'}
    for prefix, uri in ns.items():
        ET.register_namespace(prefix, uri)

    with zipfile.ZipFile(input_path, 'r') as yin:
        with zipfile.ZipFile(output_path, 'w') as yout:
            # Copy all files except word/document.xml
            for item in yin.infolist():
                if item.filename != 'word/document.xml':
                    yout.writestr(item, yin.read(item.filename))
            
            # Read and parse word/document.xml
            doc_xml = yin.read('word/document.xml')
            root = ET.fromstring(doc_xml)

            # Process all paragraphs (standard replacements)
            for p in root.findall('.//w:p', ns):
                text = get_paragraph_text(p, ns)
                if not text:
                    continue
                
                # Check for Restaurant Name (Res ID):
                if 'Restaurant Name (Res ID):' in text:
                    t_elements = p.findall('.//w:t', ns)
                    if t_elements:
                        t_elements[0].text = f"Restaurant Name (Res ID): {brand_name}"
                        t_elements[0].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
                        for t in t_elements[1:]:
                            t.text = ""
                
                # Check for Restaurant Name: (excluding Res ID)
                elif 'Restaurant Name:' in text:
                    t_elements = p.findall('.//w:t', ns)
                    if t_elements:
                        t_elements[0].text = f"Restaurant Name: {brand_name}"
                        t_elements[0].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
                        for t in t_elements[1:]:
                            t.text = ""
                
                # Check for Legal Entity Address:
                elif 'Legal Entity Address:' in text:
                    t_elements = p.findall('.//w:t', ns)
                    if t_elements:
                        t_elements[0].text = f"Legal Entity Address: {address_str}"
                        t_elements[0].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
                        for t in t_elements[1:]:
                            t.text = ""
                
                # Check for Locality:
                elif 'Locality:' in text:
                    t_elements = p.findall('.//w:t', ns)
                    if t_elements:
                        t_elements[0].text = f"Locality: {cafe_name}"
                        t_elements[0].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
                        for t in t_elements[1:]:
                            t.text = ""

                # Check for Date occurrences inside paragraphs (e.g. Effective Date, Signed at)
                else:
                    t_elements = p.findall('.//w:t', ns)
                    for t in t_elements:
                        if t.text:
                            # 1. Replace date values like "06-03-2026" or "08/03/26"
                            if re.match(r'^\s*\d{2}[-/]\d{2}[-/]\d{2,4}\s*$', t.text):
                                t.text = date_str
                            # 2. Replace substring dates within run text
                            elif re.search(r'\b\d{2}[-/]\d{2}[-/]\d{2,4}\b', t.text):
                                t.text = re.sub(r'\b\d{2}[-/]\d{2}[-/]\d{2,4}\b', date_str, t.text)

            # Reduce top/bottom page margins to allow more printable area
            for pgMar in root.findall('.//w:pgMar', ns):
                pgMar.set(f'{{{ns["w"]}}}bottom', '1000')
                pgMar.set(f'{{{ns["w"]}}}top', '1000')

            # Apply custom layout transformations (Effective Date, keepNext, and clean layouts)
            restructure_document(root, ns, date_str)

            # Write updated XML to new zip archive
            yout.writestr('word/document.xml', ET.tostring(root, encoding='utf-8'))

if __name__ == '__main__':
    if len(sys.argv) < 7:
        print("Usage: python process_docx.py input_docx output_docx brand_name cafe_name address_str date_str")
        sys.exit(1)
    process_docx(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6])
    print("Docx processed successfully.")
