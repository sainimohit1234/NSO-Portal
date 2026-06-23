import sys
import zipfile
import re
import xml.etree.ElementTree as ET

def process_docx(input_path, output_path, brand_name, cafe_name, address_str, date_str):
    # Namespace dictionary
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
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

            # Helper to get all text in a paragraph
            def get_paragraph_text(p):
                texts = []
                for t in p.findall('.//w:t', ns):
                    if t.text:
                        texts.append(t.text)
                return "".join(texts)

            # Process all paragraphs
            for p in root.findall('.//w:p', ns):
                text = get_paragraph_text(p)
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

            # Write updated XML to new zip archive
            yout.writestr('word/document.xml', ET.tostring(root, encoding='utf-8'))

if __name__ == '__main__':
    if len(sys.argv) < 7:
        print("Usage: python process_docx.py input_docx output_docx brand_name cafe_name address_str date_str")
        sys.exit(1)
    process_docx(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6])
    print("Docx processed successfully.")
