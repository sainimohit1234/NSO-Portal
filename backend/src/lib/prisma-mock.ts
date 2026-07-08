import { firebaseAdmin } from './firebase-admin';

const db = firebaseAdmin.firestore();

function getCollectionName(model: string) {
  if (model === 'globalDocument') return 'globalDocuments';
  if (model === 'storeHistory') return 'storeHistories';
  return model + 's';
}

function processWhere(where: any, query: any) {
  if (!where) return query;
  
  // Basic equal queries
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR' || key === 'NOT' || key === 'AND') continue;
    
    if (typeof value === 'object' && value !== null) {
      // Skip range/contains/not filters at the Firestore database query level
      // to avoid type mismatch issues (e.g. comparing string dates to Date objects).
      // These will be fully filtered in memory by findMany.
    } else {
      // Direct equality
      if (key === 'id') {
        // Prisma uses Int id, Firestore uses string doc id. 
        // We assume documents have an 'id' field stored, or we query by FieldPath.documentId()
        query = query.where('id', '==', value);
      } else if (key === 'isActive') {
        // Skip database-level filtering for isActive to support in-memory default of true for missing fields
      } else {
        query = query.where(key, '==', value);
      }
    }
  }
  return query;
}

function mapDocumentData(modelName: string, docId: string, data: any) {
  if (!data) return null;
  const mapped = { ...data };
  for (const key of Object.keys(mapped)) {
    if (mapped[key] && typeof mapped[key].toDate === 'function') {
      mapped[key] = mapped[key].toDate().toISOString();
    }
  }
  if (modelName === 'store') {
    if (mapped.isActive === undefined) {
      mapped.isActive = true;
    }
    if (mapped.cafeModule === undefined && mapped.cafeModel !== undefined) {
      mapped.cafeModule = mapped.cafeModel;
    }
    if (mapped.pricingVersion === undefined && mapped.menu !== undefined) {
      mapped.pricingVersion = mapped.menu;
    }
    if (mapped.signageApprovalEnabled === undefined) {
      mapped.signageApprovalEnabled = true;
    }
    if (mapped.uploadedDocuments === undefined) {
      const docsList = [];
      if (mapped.loiUrl) {
        docsList.push({
          category: 'Legal Documents',
          docType: 'loi',
          fileUrl: mapped.loiUrl,
          fileName: mapped.loiFileName || 'Letter of Intent',
          uploadedAt: new Date().toISOString()
        });
      }
      if (mapped.budgetUrl) {
        docsList.push({
          category: 'Financial Documents',
          docType: 'budget_approval',
          fileUrl: mapped.budgetUrl,
          fileName: mapped.budgetFileName || 'Budget Approval',
          uploadedAt: new Date().toISOString()
        });
      }
      if (mapped.agreementUrl || mapped.rentAgreementLink) {
        docsList.push({
          category: 'Legal Documents',
          docType: 'lease_agreement',
          fileUrl: mapped.agreementUrl || mapped.rentAgreementLink,
          fileName: mapped.agreementFileName || 'Lease Agreement',
          uploadedAt: new Date().toISOString(),
          issuedOn: mapped.rentStartDate || null,
          validUntil: mapped.rentExpiry || null
        });
      }
      if (mapped.fssaiLicense) {
        docsList.push({
          category: 'Legal Documents',
          docType: 'fssai',
          fileUrl: mapped.fssaiLicense,
          fileName: 'FSSAI License',
          uploadedAt: new Date().toISOString(),
          issuedOn: mapped.fssaiStartDate || null,
          validUntil: mapped.fssaiExpiry || null,
          fssaiNo: mapped.fssaiNo || ''
        });
      }
      if (mapped.gstCertificateLink) {
        docsList.push({
          category: 'Legal Documents',
          docType: 'gst_certificate',
          fileUrl: mapped.gstCertificateLink,
          fileName: 'GST Certificate',
          uploadedAt: new Date().toISOString()
        });
      }
      if (mapped.supportingDocs) {
        try {
          const parsed = JSON.parse(mapped.supportingDocs);
          if (Array.isArray(parsed)) {
            parsed.forEach((url, i) => {
              docsList.push({
                category: 'Miscellaneous Documents',
                docType: 'miscellaneous',
                fileUrl: url,
                fileName: `Supporting Document ${i + 1}`,
                uploadedAt: new Date().toISOString()
              });
            });
          }
        } catch (e) {
          const parts = mapped.supportingDocs.split(',').map((s) => s.trim()).filter(Boolean);
          parts.forEach((url, i) => {
            docsList.push({
              category: 'Miscellaneous Documents',
              docType: 'miscellaneous',
              fileUrl: url,
              fileName: `Supporting Document ${i + 1}`,
              uploadedAt: new Date().toISOString()
            });
          });
        }
      }
      mapped.uploadedDocuments = JSON.stringify(docsList);
    }
  }
  return { ...mapped, id: docId };
}

class MockDelegate {
  modelName: string;
  collectionName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.collectionName = getCollectionName(modelName);
  }

  async findMany(args?: any) {
    let query: any = db.collection(this.collectionName);
    
    if (args?.where && !args.where.OR && !args.where.NOT) {
      query = processWhere(args.where, query);
    }
    
    // For OR/NOT and complex queries, fetch all and filter in memory
    const snapshot = await query.get();
    let results = snapshot.docs.map((doc: any) => {
      return mapDocumentData(this.modelName, doc.id, doc.data() || {});
    });

    if (args?.where) {
      results = results.filter((item: any) => {
        let match = true;
        for (const [key, value] of Object.entries(args.where)) {
          if (key === 'OR') {
             const orClauses = value as any[];
             const orMatch = orClauses.some(clause => {
               return Object.entries(clause).every(([k, v]: [string, any]) => {
                  if (v && typeof v === 'object' && 'contains' in v) {
                    return item[k] && String(item[k]).includes(v.contains);
                  }
                  if (k === 'id' && typeof v === 'number') {
                    return parseInt(item.id) === v || item.id === v;
                  }
                  return item[k] === v;
               });
             });
             if (!orMatch) match = false;
          } else if (key === 'NOT') {
             const notClauses = value as any;
             const notMatch = Object.entries(notClauses).every(([k, v]: [string, any]) => {
                if (k === 'id' && typeof v === 'number') {
                    return parseInt(item.id) === v || item.id === v;
                }
                return item[k] === v;
             });
             if (notMatch) match = false;
          } else if (value && typeof value === 'object') {
             if ('contains' in value) {
                if (!item[key] || !String(item[key]).includes((value as any).contains)) match = false;
             } else if ('not' in value) {
                if (item[key] === (value as any).not) match = false;
             } else if ('lte' in value) {
                if (new Date(item[key]) > new Date((value as any).lte)) match = false;
             } else if ('gte' in value) {
                if (new Date(item[key]) < new Date((value as any).gte)) match = false;
             }
          } else {
             if (key === 'id') {
               if (parseInt(item.id) !== value && item.id !== String(value) && item.id !== value) match = false;
             } else {
               if (item[key] !== value) match = false;
             }
          }
        }
        return match;
      });
    }

    if (args?.orderBy) {
       for (const [key, direction] of Object.entries(args.orderBy)) {
          results.sort((a: any, b: any) => {
             const valA = a[key];
             const valB = b[key];
             if (valA < valB) return direction === 'asc' ? -1 : 1;
             if (valA > valB) return direction === 'asc' ? 1 : -1;
             return 0;
          });
       }
    }

    // Handle include mapping for areaManager and cityHead
    if (args?.include) {
       for (const result of results) {
          if (args.include.areaManager && result.areaManagerId) {
             const amDoc = await db.collection('contacts').doc(String(result.areaManagerId)).get();
             if (amDoc.exists) result.areaManager = { id: amDoc.id, ...amDoc.data() };
          }
          if (args.include.cityHead && result.cityHeadId) {
             const chDoc = await db.collection('contacts').doc(String(result.cityHeadId)).get();
             if (chDoc.exists) result.cityHead = { id: chDoc.id, ...chDoc.data() };
          }
          if (args.include.cafeManager && result.cafeManagerId) {
             const cmDoc = await db.collection('contacts').doc(String(result.cafeManagerId)).get();
             if (cmDoc.exists) result.cafeManager = { id: cmDoc.id, ...cmDoc.data() };
          }
          if (args.include.user && result.userId) {
             const uDoc = await db.collection('users').doc(String(result.userId)).get();
             if (uDoc.exists) result.user = { id: uDoc.id, ...uDoc.data() };
          }
       }
    }

    return results;
  }

  private async updateMetadataIfStore() {
    if (this.modelName === 'store') {
      try {
        await db.collection('metadata').doc('store_updates').set({ lastUpdated: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.error('Failed to update store metadata', e);
      }
    }
  }


  async findFirst(args?: any) {
    const results = await this.findMany(args);
    return results.length > 0 ? results[0] : null;
  }

  async findUnique(args: any) {
    if (!args?.where) return null;
    let docId = args.where.id || args.where.cafeCode || args.where.email;
    if (args.where.id) {
       const doc = await db.collection(this.collectionName).doc(String(args.where.id)).get();
       if (doc.exists) {
         return mapDocumentData(this.modelName, doc.id, doc.data() || {});
       }
    }
    
    // Fallback to findFirst for non-ID unique searches
    return this.findFirst(args);
  }

  async create(args: any) {
    const data = { ...args.data };
    const docRef = db.collection(this.collectionName).doc();
    // Serialize Date objects to ISO strings for consistent storage/retrieval
    for (const key of Object.keys(data)) {
      if (data[key] instanceof Date) {
        data[key] = (data[key] as Date).toISOString();
      }
    }
    data.id = docRef.id; // Store ID inside the document for easier filtering
    data.createdAt = new Date().toISOString();
    data.updatedAt = new Date().toISOString();
    await docRef.set(data);
    await this.updateMetadataIfStore();
    return data;
  }

  async update(args: any) {
    const docId = String(args.where.id);
    const data = { ...args.data, updatedAt: new Date().toISOString() };
    // Serialize Date objects to ISO strings
    for (const key of Object.keys(data)) {
      if (data[key] instanceof Date) {
        data[key] = (data[key] as Date).toISOString();
      }
    }
    await db.collection(this.collectionName).doc(docId).update(data);
    const doc = await db.collection(this.collectionName).doc(docId).get();
    await this.updateMetadataIfStore();
    return mapDocumentData(this.modelName, doc.id, doc.data() || {});
  }

  async updateMany(args: any) {
    const results = await this.findMany({ where: args.where });
    const batch = db.batch();
    for (const res of results) {
       const ref = db.collection(this.collectionName).doc(String(res.id));
       batch.update(ref, { ...args.data, updatedAt: new Date().toISOString() });
    }
    await batch.commit();
    await this.updateMetadataIfStore();
    return { count: results.length };
  }

  async delete(args: any) {
    const docId = String(args.where.id);
    await db.collection(this.collectionName).doc(docId).delete();
    await this.updateMetadataIfStore();
    return { id: docId };
  }

  async deleteMany(args: any) {
    const results = await this.findMany({ where: args.where });
    const batch = db.batch();
    for (const res of results) {
       const ref = db.collection(this.collectionName).doc(String(res.id));
       batch.delete(ref);
    }
    await batch.commit();
    await this.updateMetadataIfStore();
    return { count: results.length };
  }

  async count(args?: any) {
    const results = await this.findMany(args);
    return results.length;
  }
  
  async upsert(args: any) {
    const existing = await this.findFirst({ where: args.where });
    if (existing) {
      return this.update({ where: { id: existing.id }, data: args.update });
    } else {
      return this.create({ data: args.create });
    }
  }

  async createMany(args: any) {
    const batch = db.batch();
    for (const item of args.data) {
       const ref = db.collection(this.collectionName).doc();
       item.id = ref.id;
       item.createdAt = new Date().toISOString();
       item.updatedAt = new Date().toISOString();
       batch.set(ref, item);
    }
    await batch.commit();
    await this.updateMetadataIfStore();
    return { count: args.data.length };
  }
}

export class PrismaClient {
  user = new MockDelegate('user');
  contact = new MockDelegate('contact');
  store = new MockDelegate('store');
  storeHistory = new MockDelegate('storeHistory');
  license = new MockDelegate('license');
  globalDocument = new MockDelegate('globalDocument');
  storageFile = new MockDelegate('storageFile');
}
