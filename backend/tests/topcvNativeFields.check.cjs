const assert=require('node:assert/strict');
const {renderTopcvSource,valuesFor}=require('../src/services/topcvSourceRenderer');
const values=valuesFor({projects:[{name:'FACT PROJECT',role:'FACT ROLE',description:'FACT DETAILS',time:'2020 - 2021'}]},{});
assert.equal(values.project[0].project_name,'FACT PROJECT');
assert.equal(values.project[0].my_position,'FACT ROLE');
assert.equal(values.project[0].my_responsibility,'FACT DETAILS');
assert.equal(values.project[0].start,'2020');
assert.equal(values.project[0].end,'2021');
assert.equal(valuesFor({projects:[{sourceId:'empty'}]},{}).project.length,0);
for(const language of ['vi','en']){
 const html=renderTopcvSource({slug:'formal',title:'Formal'}, {projects:[{name:'FACT PROJECT',role:'FACT ROLE',description:'FACT DETAILS'}]}, {},language);
 const visible=html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi,'');
 for(const fact of ['FACT PROJECT','FACT ROLE','FACT DETAILS'])assert.ok(visible.includes(fact));
}
console.log('PASS native project names, roles, descriptions and dates; metadata-only items omitted');
