const mockExecute = jest.fn();

jest.mock('../database/index',()=>({
  database:{execute:mockExecute,transaction:jest.fn()},
}));

import {DocumentRepository} from '../database/repositories';

describe('DocumentRepository list performance',()=>{
  beforeEach(()=>jest.clearAllMocks());

  it('loads Library metadata without reading complete extracted document bodies',async()=>{
    mockExecute.mockResolvedValue({rows:[{
      id:'document-1',title:'Example',original_filename:'example.pdf',file_type:'pdf',local_file_path:'/documents/example.pdf',
      file_size:100,page_count:2,word_count:300,character_count:1800,extraction_status:'completed',embedding_status:'completed',
      processing_status:'ready',created_at:'now',updated_at:'now',last_opened_at:null,
    }]});

    const documents=await DocumentRepository.list();
    const sql=mockExecute.mock.calls[0]?.[0] as string;

    expect(sql).not.toContain('SELECT *');
    expect(sql).not.toContain('extracted_text');
    expect(documents[0]).not.toHaveProperty('extractedText');
  });

  it('loads Workspace metadata without duplicating its extracted text alongside sections',async()=>{
    mockExecute.mockResolvedValue({rows:[{
      id:'document-1',title:'Example',original_filename:'example.pdf',file_type:'pdf',local_file_path:'/documents/example.pdf',
      file_size:100,page_count:2,word_count:300,character_count:1800,extraction_status:'completed',embedding_status:'completed',
      processing_status:'ready',created_at:'now',updated_at:'now',last_opened_at:null,
    }]});

    const document=await DocumentRepository.getMetadata('document-1');
    const sql=mockExecute.mock.calls[0]?.[0] as string;

    expect(sql).not.toContain('SELECT *');
    expect(sql).not.toContain('extracted_text');
    expect(document).not.toHaveProperty('extractedText');
  });
});
