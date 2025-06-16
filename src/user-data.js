/**
 * Functions for generating random user data
 */

// List of first names and last names for generating random user data
const firstNames = [
  'Roberto', 'Patricia', 'Eduardo', 'Camila', 'Ricardo', 'Sofia', 
  'Gustavo', 'Larissa', 'Felipe', 'Mariana', 'João', 'Marcos', 
  'Ana', 'Carlos', 'Beatriz', 'Paulo', 'Fernanda', 'Lucas', 
  'Juliana', 'Rafael', 'Maria', 'José', 'Antonio', 'Francisco',
  'Luiz', 'Sandra', 'André', 'Tatiana', 'Bruno', 'Renata',
  'Thiago', 'Aline', 'Vinícius', 'Isabela', 'Gabriel', 'Clara',
  'Diego', 'Natália', 'Leonardo', 'Amanda', 'Matheus', 'Larissa',
  'Vinícius', 'Júlia', 'Rodrigo', 'Camila', 'Eduardo', 'Ana Clara',
  'Mariana', 'Pedro', 'Luana', 'Gustavo', 'Carla', 'Felipe',
  'Roberta', 'Thiago', 'Bruna', 'Ricardo', 'Sabrina', 'Joana',
  'Marcelo', 'Tatiane', 'Alexandre', 'Priscila', 'Fábio', 'Cíntia',
  'Leandro', 'Juliana', 'Rogério', 'Flávia', 'Samuel', 'Renato',
  

];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 
  'Pereira', 'Martins', 'Almeida', 'Rodrigues', 'Ferreira', 
  'Carvalho', 'Gomes', 'Ribeiro', 'Nunes', 'Mendes', 'Dias', 
  'Rocha', 'Fernandes', 'Cavalcanti', 'Barbosa', 'Nascimento',
  'Moreira', 'Vieira', 'Cardoso', 'Ramos', 'Machado', 'Lopes',
  'Pinto', 'Teixeira', 'Azevedo', 'Castro', 'Farias', 'Moraes',
  'Borges', 'Pimentel', 'Siqueira', 'Tavares', 'Campos',
  'Monteiro', 'Barros', 'Queiroz', 'Sá', 'Xavier', 'Cunha',
  'Freitas', 'Lacerda', 'Pereira', 'Salgado', 'Cordeiro',
  'Melo', 'Pereira', 'Santos', 'Alves', 'Gonçalves', 'Lima',
  'Pereira', 'Ribeiro', 'Silva', 'Souza', 'Oliveira', 'Costa',
  'Pereira', 'Martins', 'Almeida', 'Rodrigues', 'Ferreira',
  'Carvalho', 'Gomes', 'Ribeiro', 'Nunes', 'Mendes', 'Dias',
  'Rocha', 'Fernandes', 'Cavalcanti', 'Barbosa', 'Nascimento',
  'Moreira', 'Vieira', 'Cardoso', 'Ramos', 'Machado', 'Lopes'
];

const emailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];

/**
 * Generate a random name, email, and phone number
 * @returns {Object} User information
 */
function getRandomUserInfo() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const email = generateEmail(firstName, lastName);
  const phone = generatePhoneNumber();
  
  return {
    name: `${firstName} ${lastName}`,
    email: email,
    phone: phone
  };
}

/**
 * Generate a random email address based on name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Email address
 */
function generateEmail(firstName, lastName) {
  const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
  const separators = ['', '.', '_'];
  const separator = separators[Math.floor(Math.random() * separators.length)];
  
  // Add a random number sometimes
  const addNumber = Math.random() > 0.7;
  const number = addNumber ? Math.floor(Math.random() * 99) : '';
  
  // Choose email format randomly
  const emailFormats = [
    // firstname.lastname@domain.com
    `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}${number}@${domain}`,
    // firstnamelastname@domain.com
    `${firstName.toLowerCase()}${lastName.toLowerCase()}${number}@${domain}`,
    // firstname@domain.com
    `${firstName.toLowerCase()}${number}@${domain}`,
    // f.lastname@domain.com
    `${firstName.toLowerCase().charAt(0)}${separator}${lastName.toLowerCase()}${number}@${domain}`
  ];
  
  return emailFormats[Math.floor(Math.random() * emailFormats.length)];
}

/**
 * Generate a random Brazilian phone number
 * @returns {string} Phone number
 */
function generatePhoneNumber() {
  // Brazilian mobile phone format: (XX) 9XXXX-XXXX
  const areaCodes = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '91'];
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
  
  // Generate 8 random digits for the rest of the number
  let number = '9';  // Brazilian mobile numbers start with 9
  for (let i = 0; i < 8; i++) {
    number += Math.floor(Math.random() * 10);
  }
  
  return `${areaCode}${number}`;
}

module.exports = {
  getRandomUserInfo
};