const axios = require('axios');

// 환경 변수 설정
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const JANDI_WEBHOOK_URL = process.env.JANDI_WEBHOOK_URL;

// 투자사 목록
const companies = [
  '브리즘',
  '브라이토닉스이미징',
  'MEDiC',
  '카이젠',
  '폴리페놀팩토리',
  '브이픽스메디칼',
  'CTX',
  '임팩트AI',
  '에코토르',
  '갤럭스',
  '시안솔루션',
  '바이오솔빅스',
  '초코엔터테인먼트',
  '와이브레인',
  '유니드비티플러스',
  '에이럭스',
  '피피비스튜디오스',
  '메디팹',
  '인제니아',
  '일리아스AI',
  '아모지',
  '텔레픽스',
  'LTIS',
  '브이원텍',
  '이마고웍스',
  '압타머사이언스',
  '큐빅셀',
  '파키스탄혈장',
  '덴컴',
  '베르티스',
  '아스트로젠',
  'S2W',
  '오토위니',
  '피엑스디',
  '엔조이소프트',
  '밸런스히어로',
  '심스테크',
  '진에딧',
  '리브스메드',
  '아이앰히어',
  '웨일브릭',
  '프로티나',
  '닷',
  'SML제니트리',
  '퓨리오젠',
  '케이비즈앤코퍼레이션',
  '케이더블유바이오',
  '베지스타',
  '유리프트',
  '이을바이오',
  '셀락바이오',
  '큐렉스',
  '엔에프티랩스',
  '재영텍',
  '코넥',
  '이을커뮤니케이션아임',
  '아이메디신',
  '에프씨엠티',
  '더삼점영',
  '잇피',
  '이안',
  '에이모',
  '셀쿱스',
  '메디인테크',
  '아이벡스'
];

exports.handler = async function(event, context) {
  try {
    await collectNews();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'News collection completed successfully' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to collect news' })
    };
  }
};

async function collectNews() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const start = yesterday.toISOString().split('T')[0];
  const end = today.toISOString().split('T')[0];

  for (const company of companies) {
    try {
      const news = await searchNaverNews(company, start, end);
      if (news.length > 0) {
        await sendToJandi(company, news);
      }
    } catch (error) {
      console.error(`Error collecting news for ${company}:`, error);
    }
  }
}

async function searchNaverNews(company, start, end) {
  const query = encodeURI(company);
  const url = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=100&sort=date&start=1`;

  const response = await axios.get(url, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
    }
  });

  return response.data.items.filter(item => {
    const pubDate = new Date(item.pubDate);
    const pubDateStr = pubDate.toISOString().split('T')[0];
    return pubDateStr >= start && pubDateStr <= end;
  });
}

async function sendToJandi(company, news) {
  const message = formatJandiMessage(company, news);
  
  try {
    await axios.post(JANDI_WEBHOOK_URL, {
      body: message,
      connectColor: '#FAC11B',
      connectInfo: [{
        title: '네이버 뉴스 검색 결과',
        description: `${company}에 대한 최근 뉴스입니다.`
      }]
    });
  } catch (error) {
    console.error(`Error sending message to Jandi for ${company}:`, error);
    throw error;
  }
}

function formatJandiMessage(company, news) {
  let message = `# ${company} 관련 뉴스\n\n`;
  
  news.forEach((item, index) => {
    const title = item.title.replace(/<[^>]*>/g, '');
    message += `${index + 1}. [${title}](${item.link})\n`;
  });
  
  return message;
} 