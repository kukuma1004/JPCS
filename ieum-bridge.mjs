import {CHANNEL,IEUM_ORIGIN,bridgeNonce,acceptsMessage,assertRecordIdentity} from './ieum-contract.mjs';
import {recordSummary} from './ieum-record-model.mjs';
export function startRecordBridge(adapter,{ieumOrigin=IEUM_ORIGIN}={}){
 const nonce=bridgeNonce(location.hash),parent=window.opener;if(!nonce||!parent)return;
 if(ieumOrigin!==IEUM_ORIGIN&&!/^http:\/\/127\.0\.0\.1:\d+$/.test(ieumOrigin))throw Error('지원하지 않는 연결 주소입니다.');
 let busy=false,done=false;const send=(type,body={})=>parent.postMessage({channel:CHANNEL,nonce,type,...body},ieumOrigin);
 window.addEventListener('message',async event=>{if(!acceptsMessage(event,parent,ieumOrigin,nonce)||event.data.type!=='request'||event.data.kind!=='record'||busy||done)return;
  const state=adapter.state();if(state.mode!=='cloud'||!state.schoolId){send('waiting',{message:'기록장 창에서 기존 교사 계정으로 로그인하고 학교를 선택해주세요.'});return;}
  if(!['teacher','admin'].includes(state.role)||state.approved===false){send('error',{message:'기록장 교사 계정의 권한이 필요합니다.'});done=true;return;}
  const payload=event.data.payload;if(!payload?.identity||!/^[-\w]{1,100}$/.test(payload.recordStudentId||'')||payload.projectId!==state.projectId||payload.schoolId!==state.schoolId){send('error',{message:'기록장 학교와 이음의 학생 연결 학교가 다릅니다.'});done=true;return;}
  busy=true;try{const raw=await adapter.read(payload.recordStudentId);const latest=adapter.state();if(latest.uid!==state.uid||latest.schoolId!==state.schoolId||latest.role!==state.role||latest.mode!=='cloud'||latest.approved===false)throw Error('기록장 로그인 또는 학교가 변경되었습니다. 다시 연결해주세요.');assertRecordIdentity(raw.student,payload);if(!adapter.canRead(raw.student))throw Error('기록장에서 담당 학급으로 지정된 학생만 조회할 수 있습니다.');const data=recordSummary(raw);send('result',{studentId:payload.identity.id,data});done=true;adapter.open?.(payload.recordStudentId,payload.identity.enrollment);}catch(e){send('error',{message:e.message||'기록장 자료를 확인하지 못했습니다.'});done=true;}finally{busy=false;}
 });
}
