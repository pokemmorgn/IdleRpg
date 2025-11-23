
src/colyseus/utils/playerLoader.ts:50:6 - error TS2304: Cannot find name 'psp'.

50 if (!psp) {
        ~~~

src/colyseus/utils/playerLoader.ts:59:3 - error TS2304: Cannot find name 'psp'.

59   psp = await PlayerServerProfile.create({
     ~~~

src/colyseus/utils/playerLoader.ts:63:35 - error TS2503: Cannot find namespace 'Types'.

63       characterId: profile._id as Types.ObjectId,
                                     ~~~~~

src/colyseus/utils/playerLoader.ts:79:16 - error TS2304: Cannot find name 'psp'.

79 const exists = psp.characters.some(c =>
                  ~~~

src/colyseus/utils/playerLoader.ts:79:36 - error TS7006: Parameter 'c' implicitly has an 'any' type.

79 const exists = psp.characters.some(c =>
                                      ~

src/colyseus/utils/playerLoader.ts:84:3 - error TS2304: Cannot find name 'psp'.

84   psp.characters.push({
     ~~~

src/colyseus/utils/playerLoader.ts:85:33 - error TS2503: Cannot find namespace 'Types'.

85     characterId: profile._id as Types.ObjectId,
                                   ~~~~~

src/colyseus/utils/playerLoader.ts:88:9 - error TS2304: Cannot find name 'psp'.

88   await psp.save();
           ~~~

src/colyseus/utils/playerLoader.ts:110:15 - error TS2304: Cannot find name 'psp'.

110         gold: psp.sharedCurrencies.gold,
                  ~~~

src/colyseus/utils/playerLoader.ts:111:23 - error TS2304: Cannot find name 'psp'.

111         diamondBound: psp.sharedCurrencies.diamondBound,
                          ~~~

src/colyseus/utils/playerLoader.ts:112:25 - error TS2304: Cannot find name 'psp'.

112         diamondUnbound: psp.sharedCurrencies.diamondUnbound,
                            ~~~


Found 11 errors in the same file, starting at: src/colyseus/utils/playerLoader.ts:50
