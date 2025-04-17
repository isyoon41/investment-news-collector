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
  '임팩트에이아이',
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

// 회사별 검색 설정
const companySearchConfig = {
  // 기본 검색: 회사명만 사용
  DEFAULT: {
    useExactMatch: true,  // 정확한 회사명 매칭 사용
  },
  // 특별 검색 설정이 필요한 회사들
  '초코엔터테인먼트': {
    searchKeywords: ['초코엔터테인먼트', '초코엔터', '(주)초코엔터테인먼트'],
    excludeKeywords: ['초코릿', '초코렛', '초콜릿', '초콜렛', '초코과자', '초코파이', '초코케이크'],
    useExactMatch: true,
  },
  '시안솔루션': {
    searchKeywords: ['시안솔루션', '(주)시안솔루션'],
    excludeKeywords: ['시안화', '청산가리'],
    useExactMatch: true,
  },
  '에이럭스': {
    searchKeywords: ['에이럭스', '(주)에이럭스', 'ALUX'],
    excludeKeywords: [],
    useExactMatch: true,
  }
};

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
  const now = new Date();
  const today8am = new Date(now);
  today8am.setHours(8, 0, 0, 0);
  
  const yesterday8am = new Date(today8am);
  yesterday8am.setDate(yesterday8am.getDate() - 1);
  
  const searchEnd = now < today8am ? yesterday8am : today8am;
  const searchStart = new Date(searchEnd);
  searchStart.setDate(searchStart.getDate() - 1);

  console.log(`Collecting news from ${searchStart.toISOString()} to ${searchEnd.toISOString()}`);

  for (const company of companies) {
    try {
      const news = await searchNaverNews(company, searchStart, searchEnd);
      if (news.length > 0) {
        await sendToJandi(company, news);
      }
    } catch (error) {
      console.error(`Error collecting news for ${company}:`, error);
    }
  }
}

async function searchNaverNews(company, startDate, endDate) {
  // 회사별 검색 설정 가져오기
  const searchConfig = companySearchConfig[company] || companySearchConfig.DEFAULT;
  const searchKeywords = searchConfig.searchKeywords || [company];
  const excludeKeywords = searchConfig.excludeKeywords || [];
  
  // 모든 검색 키워드에 대한 결과를 수집
  let allResults = [];
  for (const keyword of searchKeywords) {
    const query = encodeURI(`"${keyword}"`);
    const url = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=100&sort=date&start=1`;

    try {
      const response = await axios.get(url, {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
        }
      });

      allResults = allResults.concat(response.data.items);
    } catch (error) {
      console.error(`Error searching for keyword ${keyword}:`, error);
    }
  }

  // 중복 제거 (동일한 기사가 다른 키워드로 검색될 수 있음)
  const uniqueResults = Array.from(new Set(allResults.map(item => item.link)))
    .map(link => allResults.find(item => item.link === link));

  return uniqueResults.filter(item => {
    const pubDate = new Date(item.pubDate);
    
    // HTML 태그 제거 및 텍스트 정제
    const cleanTitle = item.title.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const cleanDescription = item.description.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    
    // 제외 키워드 확인
    const hasExcludedKeyword = excludeKeywords.some(keyword => 
      cleanTitle.includes(keyword) || cleanDescription.includes(keyword)
    );
    
    if (hasExcludedKeyword) {
      return false;
    }

    // 정확한 매칭이 필요한 경우
    if (searchConfig.useExactMatch) {
      const exactMatchPattern = new RegExp(
        `(^|[\\s\\(\\[\\{]|[^가-힣\\w])(${searchKeywords.join('|')})($|[\\s\\)\\]\\}]|[^가-힣\\w])`,
        'g'
      );
      
      const titleMatches = cleanTitle.match(exactMatchPattern);
      const descriptionMatches = cleanDescription.match(exactMatchPattern);
      
      const isValidMatch = (titleMatches || descriptionMatches) && pubDate >= startDate && pubDate < endDate;
      
      if (isValidMatch) {
        console.log(`Matched news for ${company}:`, {
          title: cleanTitle,
          description: cleanDescription,
          date: pubDate,
          matchedKeywords: titleMatches || descriptionMatches
        });
      }
      
      return isValidMatch;
    }
    
    // 날짜 범위 확인
    return pubDate >= startDate && pubDate < endDate;
  });
}

async function sendToJandi(company, news) {
  const message = formatJandiMessage(company, news);
  
  try {
    await axios.post(JANDI_WEBHOOK_URL, {
      body: message,
      connectColor: '#FAC11B',
      connectInfo: [{
        title: '패스웨이 포트폴리오사 관련 뉴스',
        description: `${company} 관련 최근 뉴스입니다.`
      }]
    });
  } catch (error) {
    console.error(`Error sending message to Jandi for ${company}:`, error);
    throw error;
  }
}

function formatJandiMessage(company, news) {
  let message = '# 패스웨이 포트폴리오사 관련 뉴스\n\n';
  
  news.forEach(item => {
    const title = item.title.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const description = item.description.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    message += `**[${company}]**, **${title}**, ${item.link}\n`;
    message += `> ${description}\n\n`;
  });
  
  return message;
} 