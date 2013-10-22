/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

/*
 * Objeq Grammar
 *
 * @author Thom Bradford (github/kode4food)
 * @author Stefano Rago (github/sterago)
 */

%lex

%options case-insensitive

digit [0-9]
esc   "\\"
card  (?:[0-9]|[1-9][0-9]+)
exp   (?:[eE][-+]?[0-9]+)
frac  (?:\.[0-9]+)
ws    [\s]

%%

{card}{frac}?{exp}?\b return 'NUMBER';

'"'("\\x"[a-fA-F0-9]{2}|"\\u"[a-fA-F0-9]{4}|"\\"[^xu]|[^"{esc}\n])*'"' {
  yytext = yytext.substr(1,yyleng-2); return 'STRING';
}
"'"("\\"['bfvnrt/{esc}]|"\\u"[a-fA-F0-9]{4}|[^'{esc}])*"'" {
  yytext = yytext.substr(1,yyleng-2); return 'STRING';
}

"%"[1-9][0-9]* {
  yytext = yytext.substr(1); return 'ARGREF';
};

"%"[A-Za-z_$][A-Za-z_$0-9]* {
  yytext = yytext.substr(1); return 'SYMBOL';
}

{ws}+                        /* skip whitespace */
"as"                         return 'AS';
"undefined"                  return 'UNDEFINED';
"null"                       return 'NULL';
"true"                       return 'TRUE';
"false"                      return 'FALSE';
"where"                      return 'WHERE';
"select"                     return 'SELECT';
"contract"                   return 'CONTRACT';
"expand"                     return 'EXPAND';
"aggregate"                  return 'AGGREGATE';
("order"{ws}+)?"by"          return 'ORDER_BY';
"then"                       return 'THEN';
"this"                       return 'THIS';
"asc"                        return 'ASC';
"desc"                       return 'DESC';
"and"                        return 'AND';
"or"                         return 'OR';
"not"                        return 'NOT';
"in"                         return "IN";
"=="                         return 'EQ';
"!="                         return 'NEQ';
"=~"                         return 'RE';
"<="                         return 'LTE';
">="                         return 'GTE';
"&&"                         return 'AND';
"||"                         return 'OR';
"->"                         return 'SELECT';
":>"                         return 'CONTRACT';
"<:"                         return 'EXPAND';
":="                         return 'AGGREGATE';
"!"                          return 'NOT';
"<"                          return 'LT';
">"                          return 'GT';
"|"                          return 'THEN';
"("                          return '(';
")"                          return ')';
"["                          return '[';
"]"                          return ']';
"{"                          return '{';
"}"                          return '}';
"?"                          return '?';
":"                          return ':';
"."                          return '.';
","                          return ',';
"+"                          return '+';
"-"                          return '-';
"*"                          return '*';
"/"                          return '/';
"%"                          return '%';
[A-Za-z_$][A-Za-z_$0-9]*     return 'IDENT';
<<EOF>>                      return 'EOF';
.                            return 'INVALID';

/lex

/* Operator Associativity and Precedence */

%left '?'
%left OR
%left AND
%left EQ NEQ IN RE
%left GT GTE LT LTE
%left '+' '-'
%left '*' '/' '%'
%left NOT NEG
%left AS
%left '.'

%start program

%% /* Parser Grammar */

program
  : query EOF  { return $1; }
  ;

/*
   TODO: The step should be broken down more granularly into:
         filtering, selecting, sorting, aggregation
 */

query
  : filter                 { $$ = [$1]; }
  | step                   { $$ = [$1]; }
  | query THEN filter      { $$ = $1; $1.push($3); }
  | query THEN step        { $$ = $1; $1.push($3); }
  | query step             { $$ = $1; $1.push($2); }
  ;

filter
  : WHERE expr         { $$ = yy.node('filter', $2); }
  | expr               { $$ = yy.node('filter', $1); }
  ;

expr
  : expr '+' expr      { $$ = yy.node('add', $1, $3); }
  | expr '-' expr      { $$ = yy.node('sub', $1, $3); }
  | expr '*' expr      { $$ = yy.node('mul', $1, $3); }
  | expr '/' expr      { $$ = yy.node('div', $1, $3); }
  | expr '%' expr      { $$ = yy.node('mod', $1, $3); }
  | expr AND expr      { $$ = yy.node('and', $1, $3); }
  | expr OR expr       { $$ = yy.node('or', $1, $3); }
  | expr EQ expr       { $$ = yy.node('eq', $1, $3); }
  | expr NEQ expr      { $$ = yy.node('neq', $1, $3); }
  | expr RE expr       { $$ = yy.node('re', $1, $3); }
  | expr GT expr       { $$ = yy.node('gt', $1, $3); }
  | expr GTE expr      { $$ = yy.node('gte', $1, $3); }
  | expr LT expr       { $$ = yy.node('lt', $1, $3); }
  | expr LTE expr      { $$ = yy.node('lte', $1, $3); }
  | expr IN expr       { $$ = yy.node('in', $1, $3); }
  | expr AS SYMBOL     { $$ = yy.node('as', $1, $3); }
  | NOT expr           { $$ = yy.node('not', $2); }
  | '-' expr           %prec NEG { $$ = yy.node('neg', $2); }
  | '(' expr ')'       { $$ = $2; }
  | ternary            
  | func               
  | array              
  | obj                
  | NUMBER             { $$ = Number(yytext); }
  | STRING             { $$ = yytext; }
  | TRUE               { $$ = true; }
  | FALSE              { $$ = false; }
  | NULL               { $$ = null; }
  | UNDEFINED          { $$ = undefined; }
  | path               
  ;

ternary
  : expr '?' expr ':' expr     { $$ = yy.node('tern', $1, $3, $5); }
  ;

func
  : IDENT '(' expr_list ')'    { $$ = yy.node('func', $1, $3); }
  | IDENT '(' ')'              { $$ = yy.node('func', $1, []); }
  ;

array
  : '[' expr_list ']'          { $$ = yy.node('arr', $2); }
  | '[' ']'                    { $$ = yy.node('arr', []); }
  ;

expr_list
  : expr                       { $$ = [$1]; }
  | expr_list ',' expr         { $$ = $1; $1.push($3); }
  ;

obj
  : '{' obj_items '}'          { $$ = yy.node('obj', $2); }
  | '{' '}'                    { $$ = yy.node('obj', {}); }
  ;

obj_items
  : obj_item                   { $$ = {}; $$[$1[0]] = $1[1]; }
  | obj_items ',' obj_item     { $$ = $1; $$[$3[0]] = $3[1]; }
  ;

obj_non_id: NUMBER | STRING | TRUE | FALSE | NULL | UNDEFINED;

obj_item
  : obj_non_id ':' expr        { $$ = [$1, $3]; }
  | IDENT ':' expr             { $$ = [$1, $3]; }
  | IDENT                      { $$ = [$1, yy.path('local', $1)]; }
  ;

step
  : selector
  ;

selector
  : SELECT expr                { $$ = yy.node('select', $2); }
  | CONTRACT expr              { $$ = yy.node('contract', $2); }
  | EXPAND expr                { $$ = yy.node('expand', $2); }
  ;

step
  : sorter
  ;

sorter
  : ORDER_BY order_list        { $$ = yy.node('sort', $2); }
  ;

order_list
  : order_spec                 { $$ = [$1]; }
  | order_list ',' order_spec  { $$ = $1; $1.push($3); }
  ;

order_spec
  : local_path                 { $$ = { path: $1, ascending: true }; }
  | local_path ASC             { $$ = { path: $1, ascending: true }; }
  | local_path DESC            { $$ = { path: $1 }; }
  ;

step
  : aggregator
  ;

aggregator
  : AGGREGATE aggr_list        { $$ = yy.node('aggregate', $2); }
  ;

aggr_list
  : IDENT                      { $$ = [$1]; }
  | aggr_list ',' IDENT        { $$ = $1; $1.push($3); }
  ;

path
  : arg_path                   
  | local_path                 
  ;

arg_path
  : ARGREF                    { $$ = yy.path('arg', Number($1)-1); }
  | arg_path '.' IDENT        { $$ = $1; $1.push($3); }
  | arg_path '[' expr ']'     { $$ = $1; $1.push($3); }
  ;

local_path
  : THIS                      { $$ = yy.path('local'); }
  | IDENT                     { $$ = yy.path('local', $1); }
  | SYMBOL                    { $$ = yy.path('symbol', $1); }
  | local_path '.' IDENT      { $$ = $1; $1.push($3); }
  | local_path '[' expr ']'   { $$ = $1; $1.push($3); }
  ;
