/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 * @author Corné Oppelaar (github/EaterOfCode)
 */

/*
 * JSONiq Grammar
 */


%lex

%options case-insensitive

digits [0-9]+
esc   "\\"
card  (?:[0-9]|[1-9][0-9]+)
exp   (?:[eE][-+]?[0-9]+)
frac  (?:\.[0-9]+)
ws    [\s]
ncname (?:[A-Za-z][a-zA-Z0-9\_\-]*)
%%

{card}{frac}?{exp}?\b {
  return 'NUMBER';
}

'"'("\\x"[a-fA-F0-9]{2}|"\\u"[a-fA-F0-9]{4}|"\\"[^xu]|[^"{esc}\n])*'"' {
  yytext = yytext.substr(1,yyleng-2);
  return 'STRING';
}


{ws}+                        /* skip whitespace */
"return"                     return 'RETURN';
"for"                        return 'FOR';
"let"                        return 'LET';
"where"                      return 'WHERE';
"group"                      return 'GROUP';
"stable"                     return 'STABLE';
"order"                      return 'ORDER';
"ascending"                  return 'ASCENDING';
"descending"                 return 'DESCENDING';
"by"                         return 'BY';
"at"                         return 'AT';
"in"                         return 'IN';
"allowing"                   return 'ALLOWING';
"empty"                      return 'EMPTY';
"some"                       return 'SOME';
"every"                      return 'EVERY';
"satisfies"                  return 'SATISFIES';
"case"                       return 'CASE';
"switch"                     return 'SWITCH';
"if"                         return 'IF';
"treat"                      return 'TREAT';
"instance"                   return 'INSTANCE';
"of"                         return 'OF';
"try"                        return 'TRY';
"catch"                      return 'CATCH';
"default"                    return 'DEFAULT';
"or"                         return 'OR';
"and"                        return 'AND';
"not"                        return 'NOT';
"eq"                         return 'EQ';
"ne"                         return 'NE';
"lt"                         return 'LT';
"le"                         return 'LE';
"gt"                         return 'GT';
"ge"                         return 'GE';
"to"                         return 'TO';
"div"                        return 'DIV';
"idiv"                       return 'IDIV';
"mod"                        return 'MOD';
":="                         return 'ASSIGN';
"{"                          return '{';
"}"                          return '}';
"["                          return '[';
"]"                          return ']';
"("                          return '(';
")"                          return ')';
","                          return ',';
"."                          return '.';
":"                          return ':';
"*"                          return '*';
"+"                          return '+';
"-"                          return '-';
"!"                          return '!';
"?"                          return '?';
"$$"                         return '$$';
"$"                          return '$';
{ncname}                     return 'NCNAME';
<<EOF>>                      return 'EOF';

/lex

/* Operator Associativity and Precedence */

%start program

%% /* Parser Grammar */

program
  : expr EOF     { return yy.node('arr', $1); }
  | EOF          { return yy.node('arr', yy.list()); }
  ;

expr
  : expr ',' exprSingle     { $$ = $1; yy.listPush($1, $3); }
  | exprSingle              { $$ = yy.list($1); }
  ;

exprSingle
  : flworExpr
  | quantifiedExpr
  | switchExpr
  | ifExpr
  | tryCatchExpr
  | orExpr
  ;

flworExpr
  : flworHead flworBody flworTail { $$ = [$1,$2,$3] }
  | flworHead flworTail { $$ = [$1,$2] }
  ;

flworHead
  : forClause
  | letClause
  ;

flworBody
  : flworBody flworClause { $$ = [$1,$2]; }
  | flworClause { $$ = [$1]; }
  ;

flworClause
  : forClause
  | letClause
  | whereClause
  | groupByClause
  | orderByClause
  | countClause
  ;

flworTail
  : RETURN primaryExpr { $$  = yy.node('return',$2); }
  ;

forClause
  : FOR forBody { $$ = $2 }
  ;

forBody
  : forBody ',' forParameters { $$ = $1; $1.push($3); }
  | forParameters { $$ = [$1]; }
  ;

forParameters
  : varRef ALLOWING EMPTY AT varRef IN argument { $$ = yy.node('for',$1,$5,$7,true); }
  | varRef AT varRef IN argument { $$ = yy.node('for',$1,$3,$5,false); }
  | varRef IN argument { $$ = yy.node('for',$1,false,$3,false); }
  | varRef ALLOWING EMPTY IN argument { $$ = yy.node('for',$1,false,$5,true); }
  ;

letClause
  : LET letBody { $$ = $2; }
  ;

letBody
  : letBody ',' letTail  { $$ = yy.listPush($1, $3); }
  | letTail              { $$ = yy.list($1); }
  ;

letTail
  : varRef ASSIGN argument  { $$ = yy.node('assign', $1, $3); }
  ;

countClause
  : COUNT varRef { $$ = yy.node('count',$2); }
  ;

whereClause
  : WHERE exprSingle { $$.step('filter',$2); }
  ;

groupByClause
  : GROUP BY groupByBody { $$ = yy.step('group', $3); }
  ;

groupByBody
  : groupByBody ',' groupByItem  { $$ = yy.pushList($1, $3); }
  | groupByItem                  { $$ = yy.list($1); }
  ;

groupByItem
  : varRef ASSIGN argument { $$ = yy.node('assign', $1, $2); }
  | argument
  | varRef
  ;

orderByClause
  : ORDER BY orderByBody
  | STABLE ORDER BY orderByBody
  ;

orderByBody
  : argument 
  | argument orderByType
  | orderByBody ',' argument
  | orderByBody ',' argument orderByType
  ;

orderByType
  : ASCENDING
  | DESCENDING
  ;

quantifiedExpr
  : SOME quantifiedBody SATISFIES exprSingle
  | EVERY quantifiedBody SATISFIES exprSingle
  ;

quantifiedBody
  : quantifiedBody ',' varRef IN exprSingle
  | varRef IN exprSingle 
  ;

switchExpr
  : SWITCH '(' expr ')' SwitchCaseClause+ DEFAULT RETURN exprSingle
  ;

switchCaseClause
  : switchCaseBody RETURN exprSingle
  ;

switchCaseBody
  : switchCaseBody CASE exprSingle
  | CASE exprSingle
  ;

ifExpr
  : IF '(' expr ')' 'then' exprSingle 'else' exprSingle
  ;

tryCatchExpr
  : TRY '{' expr '}' CATCH '*' '{' expr '}'
  ;

orExpr
  : andExpr
  | orExpr OR andExpr { $$ = yy.node('or', $1, $3); }
  ;

andExpr 
  : notExpr
  | andExpr AND notExpr { $$ = yy.node('and', $1, $3); }
  ;

notExpr 
  : NOT comparisonExpr { $$ = yy.node('not', $2); }
  | comparisonExpr
  ;

comparisonExpr
  : stringConcatExpr
  | stringConcatExpr EQ stringConcatExpr { $$ = yy.node('eq', $1, $3); }
  | stringConcatExpr NE stringConcatExpr { $$ = yy.node('neq', $1, $3); }
  | stringConcatExpr LT stringConcatExpr { $$ = yy.node('lt', $1, $3); }
  | stringConcatExpr LE stringConcatExpr { $$ = yy.node('lte', $1, $3); }
  | stringConcatExpr GT stringConcatExpr { $$ = yy.node('gt', $1, $3); }
  | stringConcatExpr GE stringConcatExpr { $$ = yy.node('gte', $1, $3); }
  ;

stringConcatExpr
  : rangeExpr
  | stringConcatExpr '||' rangeExpr  { $$ = yy.node('add', $1, $3); }
  ;

rangeExpr
  : additiveExpr
  | additiveExpr TO additiveExpr
  ;

additiveExpr
  : multiplicativeExpr
  | additiveExpr '+' multiplicativeExpr { $$ = yy.node('add', $1, $3); }
  | additiveExpr '-' multiplicativeExpr { $$ = yy.node('sub', $1, $3); }
  ;

multiplicativeExpr
  : unaryExpr
  | multiplicativeExpr '*' unaryExpr { $$ = yy.node('mul', $1, $3); }
  | multiplicativeExpr DIV unaryExpr { $$ = yy.node('div', $1, $3); }
  | multiplicativeExpr IDIV unaryExpr { $$ = yy.node('idiv', $1, $3); }
  | multiplicativeExpr MOD unaryExpr { $$ = yy.node('mod', $1, $3); }
  ;

unaryExpr
  : simpleMapExpr
  | '+' unaryExpr
  | '-' unaryExpr %prec NEG { $$ = yy.node('neg', $2); }
  ;

simpleMapExpr
  : argument
  | simpleMapExpr '!' argument
  ;

primaryExpr
  : literal
  | varRef
  | parenthesizedExpr
  | contextItemExpr
  | functionCall
  | orderedExpr
  | unorderedExpr
  | objectConstructor
  | arrayConstructor
  ;

literal
  : BooleanLiteral 
  | NullLiteral;

booleanLiteral
  : 'true' { $$ = true; }
  | 'false' { $$ = false; }
  ;

nullLiteral
  : 'null' { $$ = null; }
  ;

varRef
  : '$' varRefBody { $$ = $2 }
  ;

varRefBody 
  : varRefBody '.' NCNAME { $$ = yy.pathPush($1, $3); }
  | NCNAME { $$ = yy.localPath($1); }
  ;

parenthesizedExpr
  : '(' expr ')' { $$ = $2; }
  | '(' ')'
  ;

contextItemExpr
  : '$$'  
  ;

orderedExpr
  : 'ordered' '{' expr '}'
  ;

unorderedExpr
  : 'unordered' '{' expr '}'
  ;

functionCall
  : NCNAME '(' argumentList ')' { $$ = yy.node('func', $1, $3); }
  | NCNAME '(' ')' { $$ = yy.node('func', $1, yy.list()); }
  ;

argument
  : literal { $$ = $1 }
  | STRING { $$ = yytext; }
  | NUMBER { $$ = Number(yytext); }
  | variableChain { $$ = $1 }
  | orExpr { $$ = $1 }
  | arrayConstructor { $$ = $1 }
  ;

variableChain
  : variableChainStart variableChainBody { $$ = yy.node('variablechain',$1,$2); }
  | variableChainStart { $$ = yy.node('variablechain',$1); }
  ;

variableChainStart
  : functionCall { $$ = yy.localPath($1); }
  | '$' NCNAME   { $$ = yy.localPath($2); }
  | contextItemExpr { $$ = yy.localPath($1); }
  | parenthesizedExpr { $$ = yy.localPath($1); }
  ; 

variableChainBody
  : variableChainElement { $$ = yy.paramPath($1); }
  | variableChainBody variableChainElement { $$ = yy.pathPush($1, $2); }
  ;

variableChainElement
  : '(' argumentList ')' { $$ = $2; }
  | '(' ')'
  | '.' NCNAME { $$ = $2; }
  | '[' orExpr ']' { $$ = $2; }
  | '!' contextItemExpr variableChainBody
  ;

objectConstructor
  : '{' objectBody '}' { $$ = yy.node('obj', $2); }
  | '{|' expr '|}'
  | '{' '}' { $$ = yy.node('obj', yy.map()); }
  ;

objectBody 
  : objectBody ',' pairConstructor { $$ = yy.mapPush($1, $3); }
  | pairConstructor { $$ = yy.map($1); }
  ;

pairConstructor
  :  NCNAME ':' argument { $$ = yy.pair($1, $3); }
  |  STRING ':' argument { $$ = yy.pair($1, $3); }
  ;


arrayConstructor
  : '[' argumentList ']' { $$ = yy.node('arr', $2); }
  | '[' ']' { $$ = yy.node('arr', yy.list()); }
  ;

argumentList
  : argumentList ',' orExpr { $$ = $1, $1.push($3); }
  | argument { $$ = [$1]; }
  ;
